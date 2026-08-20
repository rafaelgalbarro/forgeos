/**
 * ForgeOS TradingEngine
 * Orquesta el ciclo completo: anÃ¡lisis IA â†’ validaciÃ³n de riesgo â†’ PENDING_APPROVAL â†’ ejecuciÃ³n IBKR
 * Solo servidor (API routes) â€” llama IBKR FastAPI directamente, sin loopback HTTP a Next.js.
 */

import 'server-only'

import { RiskManager } from './risk/risk-manager'
import { TRADING_CONFIG } from './trading.config'
import { OrderApprovalGate } from './order-approval'
import {
  incrementAutoApprovalCount,
} from './auto-approval'
import { registerExecutedPosition } from './position-monitor'
import { evaluateProStrategies } from './strategies/pro-strategies'
import { getHistory } from '@/lib/market-data/fmp'
import { getMacroContext } from '@/lib/market-data/macro-context'
import { notifyPreTradeHold } from '@/lib/notifications/telegram-bot'
import { sendTelegramMessage } from '@/lib/notifications/telegram-bot'
import { recordSignalForTelegram } from '@/lib/notifications/telegram-handler'
import { publishInvestmentEvent } from '@/lib/notifications/investment-events'
import { expireStalePendingApprovals } from '@/lib/investment/order-approval-service'
import { ensureIbkrBrokerConnected } from '@/lib/trading/ibkr-reconnect'
import {
  fetchLiveLimitPrice,
  fetchTradingAccountSnapshot,
  fetchTradingOpenSymbols,
  fetchTradingPosition,
  fetchTradingPrice,
} from '@/lib/trading/ibkr-data'
import { midFromBidAsk } from '@/lib/trading/limit-price'
import { getInvestmentRuntimeFlags } from '@/lib/investment/runtime-flags'
import { submitSupervisedLiveLimitOrder } from '@/lib/investment/ibkr-supervised-submit'
import { US_QUOTE_EXCHANGES } from '@/lib/trading/ticker-price-routes'
import { getUsMarketSession } from './market-session'
import { recordMlSignal } from '@/lib/ml/signal-trainer'
import { getTickerInfo } from '@/lib/market-data/yahoo-finance'
import {
  buildSmartOrderPlan,
  formatChecklistForTelegram,
  isPreTradeChecklistEnabled,
  isSmartExecutionEnabled,
  runPreTradeChecklist,
  trailingStopPctFromPlan,
  type SmartOrderPlan,
} from './smart-execution'
import {
  evaluatePortfolioPolicy,
  isPortfolioOptimizerEnabled,
} from './portfolio-optimizer'
import { getInstitutionalMacroCaution24h } from '@/lib/market-data/institutional-scanner'
import { loadTradingState } from './trading-state-store'

export type OrderResult = {
  orderId?: string
  approvalId?: string
  status:
    | 'EXECUTED'
    | 'PENDING_APPROVAL'
    | 'REJECTED_RISK'
    | 'REJECTED_CONFIDENCE'
    | 'HOLD'
    | 'ERROR'
  ticker: string
  direction: 'BUY' | 'SELL' | 'HOLD'
  sharesOrValue?: number
  price?: number
  reason: string
  signal: { confidence: number; reasoning: string; urgency: string }
  timestamp: string
  stopLoss?: number
  takeProfit?: number
}

export type TradeCycleResult = {
  cycleId: string
  startedAt: string
  completedAt: string
  accountSnapshot: { navUSD: number; cashUSD: number; dailyPnlUSD: number }
  orders: OrderResult[]
  systemHalted: boolean
  haltReason?: string
}

export class TradingEngine {
  private risk = RiskManager.getInstance()
  private approvals = OrderApprovalGate.getInstance()

  private static readonly TICKER_TIMEOUT_MS = 20_000
  private static readonly MAX_SHARES_PER_ORDER = 10
  private static readonly CYCLE_CONCURRENCY = 4

  private static async withTickerTimeout<T>(
    promise: Promise<T>,
    ticker: string,
    ms: number = TradingEngine.TICKER_TIMEOUT_MS,
  ): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined
    try {
      return await Promise.race([
        promise,
        new Promise<T>((_, reject) => {
          timer = setTimeout(
            () => reject(new Error(`${ticker} timeout ${ms}ms`)),
            ms,
          )
        }),
      ])
    } finally {
      if (timer) clearTimeout(timer)
    }
  }

  /**
   * Ejecuta un ciclo de trading completo para una lista de tickers.
   * Llamado por el API route de Next.js cada X minutos.
   * Ã“rdenes vÃ¡lidas quedan en PENDING_APPROVAL (no se ejecutan automÃ¡ticamente).
   */
  async runCycle(tickers: string[]): Promise<TradeCycleResult> {
    const cycleId = `cycle_${Date.now()}`
    const startedAt = new Date().toISOString()
    const orders: OrderResult[] = []

    await expireStalePendingApprovals()

    // 1. Obtener snapshot de cuenta
    const account = await this.fetchAccountSnapshot()

    // 2. Verificar si ya estÃ¡ detenido
    if (this.risk.isHalted()) {
      return {
        cycleId, startedAt, completedAt: new Date().toISOString(),
        accountSnapshot: account, orders,
        systemHalted: true, haltReason: this.risk.getHaltReason(),
      }
    }

    // 3. Procesar tickers con Pro Strategies (concurrencia limitada anti-429)
    console.log(`[ProStrategy] Ciclo ${cycleId}: evaluando ${tickers.length} tickers (concurrency=${TradingEngine.CYCLE_CONCURRENCY})`)
    const jobs: Array<Promise<OrderResult | null>> = []
    let cursor = 0
    const worker = async (): Promise<void> => {
      while (cursor < tickers.length) {
        if (this.risk.isHalted()) return
        const i = cursor++
        const ticker = tickers[i]!
        jobs[i] = (async () => {
          try {
            const order = await TradingEngine.withTickerTimeout(
              this.processTicker(ticker, account),
              ticker,
            )
            if (order.status === 'PENDING_APPROVAL' && order.direction === 'BUY' && order.sharesOrValue) {
              account.cashUSD = Math.max(0, account.cashUSD - order.sharesOrValue)
            }
            if (order.status === 'EXECUTED') {
              console.log(`[Signal] ${ticker}: EXECUTED conf=${(order.signal.confidence * 100).toFixed(0)}%`)
            } else if (order.direction === 'BUY') {
              console.log(
                `[Signal] ${ticker}: BUY status=${order.status} conf=${(order.signal.confidence * 100).toFixed(0)}% reason=${order.reason}`,
              )
            }
            return order
          } catch (err) {
            const msg = err instanceof Error ? err.message : 'Error desconocido'
            console.warn(`[ProStrategy] ${ticker}: error — ${msg}`)
            console.error(`[AutoExecute] ${ticker} → ERROR: ${msg}`)
            return {
              status: 'ERROR' as const,
              ticker,
              direction: 'BUY' as const,
              reason: msg,
              signal: { confidence: 0, reasoning: 'Error en ciclo', urgency: 'LOW' as const },
              timestamp: new Date().toISOString(),
            }
          }
        })()
        await jobs[i]
      }
    }
    await Promise.all(
      Array.from({ length: Math.min(TradingEngine.CYCLE_CONCURRENCY, Math.max(1, tickers.length)) }, () =>
        worker(),
      ),
    )
    for (const job of jobs) {
      if (!job) continue
      const item = await job
      if (item) orders.push(item)
    }

    const señalesBuy = orders.filter((o) => o.direction === 'BUY').length
    const autoEjecutadas = orders.filter((o) => o.status === 'EXECUTED' && o.direction === 'BUY').length
    const fallidas = orders.filter(
      (o) =>
        o.direction === 'BUY' &&
        (o.status === 'ERROR' ||
          o.status === 'REJECTED_RISK' ||
          o.status === 'REJECTED_CONFIDENCE' ||
          o.status === 'HOLD'),
    ).length
    console.log(
      `[ProStrategy] Ciclo fin: ${orders.length} tickers | señales BUY=${señalesBuy} | auto-ejecutadas=${autoEjecutadas} | fallidas=${fallidas}`,
    )

    return {
      cycleId, startedAt, completedAt: new Date().toISOString(),
      accountSnapshot: account, orders,
      systemHalted: this.risk.isHalted(),
      haltReason: this.risk.isHalted() ? this.risk.getHaltReason() : undefined,
    }
  }

  /**
   * Aprueba una orden PENDING_APPROVAL y solo entonces llama a executeOrder.
   */
  async approveAndExecute(
    approvalId: string,
    opts?: { skipPreTradeRecheck?: boolean },
  ): Promise<OrderResult> {
    const pending = this.approvals.get(approvalId)
    if (!pending) throw new Error(`Approval not found: ${approvalId}`)

    await ensureIbkrBrokerConnected()

    // Re-run pre-trade gate unless founder explicitly approved via Telegram.
    if (!opts?.skipPreTradeRecheck && isPreTradeChecklistEnabled()) {
      let priceSnap: Awaited<ReturnType<typeof fetchTradingPrice>> | null = null
      try {
        priceSnap = await this.fetchPrice(pending.ticker)
      } catch {
        priceSnap = null
      }
      const recheck = await runPreTradeChecklist({
        ticker: pending.ticker,
        direction: pending.direction,
        currentPrice: priceSnap?.currentPrice ?? pending.price,
        bid: priceSnap?.bid ?? pending.price,
        ask: priceSnap?.ask ?? pending.price,
        volume: priceSnap?.volume ?? 0,
        orderShares: pending.shares,
        orderValueUSD: pending.orderValueUSD,
      })
      if (recheck.hold) {
        void notifyPreTradeHold({
          ticker: pending.ticker,
          reason: recheck.reason,
          htmlBody: formatChecklistForTelegram(pending.ticker, recheck),
        }).catch(() => undefined)
        return {
          approvalId,
          status: 'HOLD',
          ticker: pending.ticker,
          direction: 'HOLD',
          reason: recheck.reason,
          signal: pending.signal,
          timestamp: new Date().toISOString(),
          stopLoss: pending.stopLoss,
          takeProfit: pending.takeProfit,
        }
      }
    }

    const approved = this.approvals.approve(approvalId)
    this.approvals.assertApproved(approvalId)

    const orderId = await this.executeOrder({
      approvalId,
      ticker: approved.ticker,
      direction: approved.direction,
      shares: approved.shares,
      orderType: approved.orderType,
      limitPrice: approved.limitPrice,
      outsideRth: approved.outsideRth,
      smartPlan: approved.smartPlan,
      stopLoss: approved.stopLoss,
      takeProfit: approved.takeProfit,
    })

    this.approvals.markExecuted(approvalId, orderId)
    this.risk.recordTrade()

    if (approved.direction === 'BUY' && approved.stopLoss && approved.takeProfit) {
      await registerExecutedPosition({
        ticker: approved.ticker,
        shares: approved.shares,
        entryPrice: approved.price,
        stopLoss: approved.stopLoss,
        takeProfit: approved.takeProfit,
        orderId,
        trailingStopPct: approved.smartPlan?.trailingStopPct,
      })
    }

    publishInvestmentEvent({
      type: 'order_executed',
      at: new Date().toISOString(),
      payload: { ticker: approved.ticker, direction: approved.direction, orderId },
    })

    return {
      orderId,
      approvalId,
      status: 'EXECUTED',
      ticker: approved.ticker,
      direction: approved.direction,
      sharesOrValue: approved.orderValueUSD,
      price: approved.price,
      reason: approved.reason,
      signal: approved.signal,
      timestamp: new Date().toISOString(),
      stopLoss: approved.stopLoss,
      takeProfit: approved.takeProfit,
    }
  }

  async rejectPending(approvalId: string): Promise<OrderResult> {
    const rejected = this.approvals.reject(approvalId)
    return {
      approvalId,
      status: 'ERROR',
      ticker: rejected.ticker,
      direction: rejected.direction,
      reason: `Rejected pending approval ${approvalId}`,
      signal: rejected.signal,
      timestamp: new Date().toISOString(),
    }
  }

  private async processTicker(ticker: string, account: {
    navUSD: number; cashUSD: number; dailyPnlUSD: number; openPositionsCount: number
  }): Promise<OrderResult> {
    const priceData = await this.fetchPrice(ticker)

    const quoteExchange = priceData.quoteExchange ?? 'SMART'
    const usSession = US_QUOTE_EXCHANGES.has(quoteExchange.toUpperCase())
      ? getUsMarketSession()
      : null

    if (usSession) {
      // 24h mode: always tradeable weekdays via outside_rth
      if (!usSession.isTradeable) {
        return {
          status: 'HOLD', ticker, direction: 'HOLD',
          reason: `${ticker}: fin de semana / no operable (${usSession.sessionLabel})`,
          signal: { confidence: 0, reasoning: 'Fuera de horario USA', urgency: 'LOW' },
          timestamp: new Date().toISOString(),
        }
      }
    }

    const existingPosition = await this.fetchPosition(ticker)
    if (
      existingPosition &&
      Number.isFinite(existingPosition.shares) &&
      Math.abs(existingPosition.shares) > 0
    ) {
      return {
        status: 'HOLD',
        ticker,
        direction: 'HOLD',
        reason: `${ticker}: ya existe posiciÃ³n abierta (diversificaciÃ³n 1 posiciÃ³n por ticker)`,
        signal: { confidence: 0, reasoning: 'Ticker already open', urgency: 'LOW' },
        timestamp: new Date().toISOString(),
      }
    }
        const usExtendedHours = true // 24h: always submit with outside_rth

    // Professional strategies — reuse FMP history when possible
    const historicalData = await getHistory(ticker, 90).catch(() => [])
    const change1dPct =
      priceData.previousClose > 0
        ? ((priceData.currentPrice - priceData.previousClose) / priceData.previousClose) * 100
        : 0
    const strategy = await evaluateProStrategies(ticker, {
      price: priceData.currentPrice,
      change1dPct,
      volume: priceData.volume,
      yearHigh: priceData.high52w,
      historicalData,
    })
    const signal = {
      direction: strategy.direction === 'BUY' ? ('BUY' as const) : ('HOLD' as const),
      confidence: strategy.confidence,
      reasoning: strategy.reasoning,
      urgency: strategy.urgency,
      suggestedOrderType: 'LMT' as const,
      suggestedLimitPrice: priceData.currentPrice,
      stopLoss: strategy.stopLoss,
      takeProfit: strategy.takeProfit,
      primaryStrategy: strategy.primaryStrategy,
    }

    if (signal.direction === 'HOLD') {
      // evaluateProStrategies already logged "[ProStrategy] TICKER: ninguna..."
      return {
        status: 'HOLD', ticker, direction: 'HOLD',
        reason: signal.reasoning,
        signal: { confidence: signal.confidence, reasoning: signal.reasoning, urgency: signal.urgency },
        timestamp: new Date().toISOString(),
      }
    }

    recordSignalForTelegram({
      ticker,
      direction: signal.direction,
      confidence: signal.confidence,
      at: new Date().toISOString(),
    })

    // Account-aware price filter (small accounts)
    const maxPriceForAccount = account.cashUSD < 25 ? 15 : 50
    if (priceData.currentPrice > maxPriceForAccount) {
      console.warn(
        `[AutoExecute] ${ticker} BLOCKED: precio $${priceData.currentPrice.toFixed(2)} > umbral $${maxPriceForAccount}`,
      )
      return {
        status: 'REJECTED_RISK',
        ticker,
        direction: signal.direction,
        reason: `Precio $${priceData.currentPrice.toFixed(2)} > umbral cuenta ($${maxPriceForAccount})`,
        signal: { confidence: signal.confidence, reasoning: signal.reasoning, urgency: signal.urgency },
        timestamp: new Date().toISOString(),
      }
    }

    const minConfidence = TRADING_CONFIG.ai.minConfidenceToTrade

    if (signal.confidence < minConfidence) {
      return {
        status: 'REJECTED_CONFIDENCE', ticker, direction: signal.direction,
        reason: `Confianza ${(signal.confidence * 100).toFixed(0)}% < mÃ­nimo ${(minConfidence * 100).toFixed(0)}%`,
        signal: { confidence: signal.confidence, reasoning: signal.reasoning, urgency: signal.urgency },
        timestamp: new Date().toISOString(),
      }
    }

    // Phase G â€” Portfolio optimizer (Kelly + correlation + defensive caps)
    let optimizerOverrides:
      | {
          maxPositionPct?: number
          allowNewTrade?: boolean
          denyReason?: string
          mode?: 'NORMAL' | 'DEFENSIVE'
        }
      | undefined
    if (isPortfolioOptimizerEnabled()) {
      let existingSymbols: string[] = []
      try {
        existingSymbols = await fetchTradingOpenSymbols()
      } catch {
        existingSymbols = loadTradingState().monitoredPositions.map((p) => p.ticker)
      }
      const portfolioDailyPct =
        account.navUSD > 0 && Number.isFinite(account.dailyPnlUSD)
          ? (account.dailyPnlUSD / account.navUSD) * 100
          : null
      const policy = await evaluatePortfolioPolicy({
        proposedTicker: ticker,
        direction: signal.direction,
        existingSymbols,
        monitoredPositions: loadTradingState().monitoredPositions,
        navUSD: account.navUSD,
        portfolioReturnPct: portfolioDailyPct,
      })
      optimizerOverrides = {
        maxPositionPct: policy.maxPositionPct,
        allowNewTrade: policy.allowNewTrade,
        denyReason: policy.allowNewTrade
          ? undefined
          : policy.reasons.find((r) => /block|corr|defensive|universo/i.test(r)) ??
            policy.reasons[0] ??
            'Portfolio optimizer blocked new trade',
        mode: policy.mode,
      }
      if (!policy.allowNewTrade) {
        return {
          status: 'REJECTED_RISK',
          ticker,
          direction: signal.direction,
          reason: `[PortfolioOptimizer] ${optimizerOverrides.denyReason}`,
          signal: {
            confidence: signal.confidence,
            reasoning: signal.reasoning,
            urgency: signal.urgency,
          },
          timestamp: new Date().toISOString(),
        }
      }
    }

    const riskCheck = this.risk.checkOrder(
      account,
      {
        ticker,
        currentPrice: priceData.currentPrice,
        bid: priceData.bid,
        ask: priceData.ask,
        quoteExchange: priceData.quoteExchange,
        volume: priceData.volume,
        usExtendedHours,
      },
      signal.direction,
      optimizerOverrides,
      signal.confidence,
    )
    if (!riskCheck.allowed) {
      console.warn(`[AutoExecute] ${ticker} BLOCKED risk: ${riskCheck.reason}`)
      return {
        status: 'REJECTED_RISK', ticker, direction: signal.direction,
        reason: riskCheck.reason,
        signal: { confidence: signal.confidence, reasoning: signal.reasoning, urgency: signal.urgency },
        timestamp: new Date().toISOString(),
      }
    }

    // Strategy SL/TP override
    const strategyStopLoss = signal.stopLoss
    const strategyTakeProfit = signal.takeProfit
    const riskOk = {
      ...riskCheck,
      stopLossPrice: strategyStopLoss > 0 ? strategyStopLoss : riskCheck.stopLossPrice,
      takeProfitPrice: strategyTakeProfit > 0 ? strategyTakeProfit : riskCheck.takeProfitPrice,
    }

    const orderValueUSD = riskOk.maxOrderValueUSD
    const formulaShares = Math.floor((account.cashUSD * 0.5) / priceData.currentPrice)
    if (formulaShares <= 0) {
      return {
        status: 'REJECTED_RISK',
        ticker,
        direction: signal.direction,
        reason: `Sizing=0 con cash $${account.cashUSD.toFixed(2)} y precio $${priceData.currentPrice.toFixed(2)}`,
        signal: { confidence: signal.confidence, reasoning: signal.reasoning, urgency: signal.urgency },
        timestamp: new Date().toISOString(),
      }
    }
    const resolvedShares = Math.max(1, Math.min(TradingEngine.MAX_SHARES_PER_ORDER, formulaShares))

    const suggested =
      signal.suggestedLimitPrice != null && signal.suggestedLimitPrice > 0
        ? signal.suggestedLimitPrice
        : undefined
    const mid = midFromBidAsk(priceData.bid, priceData.ask)
    const limitPrice =
      suggested ??
      (priceData.currentPrice > 0 ? priceData.currentPrice : undefined) ??
      mid ??
      undefined
    if (limitPrice == null) {
      return {
        status: 'HOLD', ticker, direction: 'HOLD',
        reason: `Sin limitPrice para ${ticker}`,
        signal: { confidence: signal.confidence, reasoning: signal.reasoning, urgency: signal.urgency },
        timestamp: new Date().toISOString(),
      }
    }

    // Phase F â€” Pre-trade checklist gates
    let smartPlan: SmartOrderPlan | undefined
    let checklistSnapshot:
      | {
          passed: boolean
          reason: string
          ranAt: string
          failedIds: string[]
        }
      | undefined

    if (isPreTradeChecklistEnabled()) {
      const macroCtx = await getMacroContext().catch(() => null)
      const macroCaution24h = await getInstitutionalMacroCaution24h().catch(() => null)
      const checklist = await runPreTradeChecklist({
        ticker,
        direction: signal.direction,
        currentPrice: priceData.currentPrice,
        bid: priceData.bid,
        ask: priceData.ask,
        volume: priceData.volume,
        orderShares: resolvedShares,
        orderValueUSD,
        macro: macroCtx,
        macroCaution24h,
      })
      checklistSnapshot = {
        passed: checklist.passed,
        reason: checklist.reason,
        ranAt: checklist.ranAt,
        failedIds: checklist.checks.filter((c) => c.status === 'FAIL').map((c) => c.id),
      }
      if (checklist.hold) {
        void notifyPreTradeHold({
          ticker,
          reason: checklist.reason,
          htmlBody: formatChecklistForTelegram(ticker, checklist),
        }).catch((err) => {
          console.warn(
            '[TradingEngine] notifyPreTradeHold error:',
            err instanceof Error ? err.message : err,
          )
        })
        return {
          status: 'HOLD',
          ticker,
          direction: 'HOLD',
          reason: checklist.reason,
          signal: {
            confidence: signal.confidence,
            reasoning: signal.reasoning,
            urgency: signal.urgency,
          },
          timestamp: new Date().toISOString(),
          stopLoss: riskOk.stopLossPrice,
          takeProfit: riskOk.takeProfitPrice,
        }
      }
    }

    if (isSmartExecutionEnabled()) {
      smartPlan = buildSmartOrderPlan({
        ticker,
        direction: signal.direction,
        shares: resolvedShares,
        currentPrice: priceData.currentPrice,
        limitPrice,
        stopLoss: riskOk.stopLossPrice,
        takeProfit: riskOk.takeProfitPrice,
        atr: null,
      })
    }

    const effectiveStopLoss = smartPlan?.bracket?.stopLoss ?? riskOk.stopLossPrice
    const effectiveTakeProfit = smartPlan?.bracket?.takeProfit ?? riskOk.takeProfitPrice

    // 100% automatic: confidence >= 60% â†’ AUTO_APPROVE
    if (signal.confidence < TRADING_CONFIG.ai.minConfidenceToTrade) {
      return {
        status: 'HOLD', ticker, direction: 'HOLD',
        reason: 'Confianza < 60% (descartada)',
        signal: { confidence: signal.confidence, reasoning: signal.reasoning, urgency: signal.urgency },
        timestamp: new Date().toISOString(),
      }
    }

    const pending = this.approvals.enqueue({
      ticker,
      direction: signal.direction,
      shares: resolvedShares,
      orderType: signal.suggestedOrderType || 'LMT',
      limitPrice,
      orderValueUSD,
      price: priceData.currentPrice,
      stopLoss: effectiveStopLoss,
      takeProfit: effectiveTakeProfit,
      reason: signal.reasoning,
      signal: { confidence: signal.confidence, reasoning: signal.reasoning, urgency: signal.urgency },
      outsideRth: true,
      preTradeChecklist: checklistSnapshot,
      smartPlan: smartPlan
        ? {
            planId: smartPlan.planId,
            kinds: [...smartPlan.kinds],
            stopLoss: smartPlan.bracket?.stopLoss,
            takeProfit: smartPlan.bracket?.takeProfit,
            trailingStopPct: trailingStopPctFromPlan(smartPlan, priceData.currentPrice),
            icebergDisplayQty: smartPlan.iceberg?.displayQuantity,
            vwapSliceCount: smartPlan.vwap?.slices.length,
            brokerSupportedNow: smartPlan.brokerMapping.supportedNow,
            plannedFields: [...smartPlan.brokerMapping.plannedFields],
            realSubmitNote: smartPlan.brokerMapping.realSubmitNote,
          }
        : undefined,
    })

    publishInvestmentEvent({
      type: 'signal',
      at: new Date().toISOString(),
      payload: { ticker, direction: signal.direction, confidence: signal.confidence, approvalId: pending.approvalId },
    })

    void (async () => {
      try {
        const info = await getTickerInfo(ticker).catch(() => null)
        recordMlSignal({
          ticker,
          direction: 'BUY',
          confidence: signal.confidence,
          pattern: signal.primaryStrategy,
          sector: info?.sector ?? null,
          vix: null,
          source: 'trading-engine',
          approvalId: pending.approvalId,
          indicators: {
            rsi: strategy.rsi,
            squeezeActive: false,
            relativeVolume: strategy.metrics.relVolume,
            macdHist: null,
            adx: null,
            goldenCross: strategy.strategyIds.includes('MA_CROSSOVER'),
            deathCross: false,
          },
        })
      } catch (err) {
        console.warn(
          '[TradingEngine] recordMlSignal error:',
          err instanceof Error ? err.message : err,
        )
      }
    })()

    incrementAutoApprovalCount()
    console.log(
      `[Signal] ${ticker}: ${signal.primaryStrategy} conf=${(signal.confidence * 100).toFixed(0)}% → auto-ejecutar`,
    )
    console.log(
      `[AutoExecute] ${ticker} BUY conf=${(signal.confidence * 100).toFixed(0)}% qty=${resolvedShares} ` +
        `limit=$${limitPrice.toFixed(2)} → llamando approveAndExecute/submitSupervisedLiveLimitOrder`,
    )

    try {
      const executed = await this.approveAndExecute(pending.approvalId, { skipPreTradeRecheck: true })
      if (executed.status === 'EXECUTED') {
        console.log(
          `[AutoExecute] ${ticker} → orden enviada ibkrId=${executed.orderId ?? 'n/a'} status=EXECUTED`,
        )
        await sendTelegramMessage(
          `⚡ AUTO: ${ticker} BUY ${resolvedShares}@$${priceData.currentPrice.toFixed(2)} | ` +
            `Conf: ${(signal.confidence * 100).toFixed(0)}% | ${signal.primaryStrategy} | ` +
            `SL: $${effectiveStopLoss.toFixed(2)} | TP: $${effectiveTakeProfit.toFixed(2)}`,
        )
      } else {
        console.warn(
          `[AutoExecute] ${ticker} → no EXECUTED status=${executed.status} reason=${executed.reason}`,
        )
      }
      return executed
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`[AutoExecute] ${ticker} → ERROR: ${msg}`)
      return {
        approvalId: pending.approvalId,
        status: 'ERROR',
        ticker,
        direction: 'BUY',
        sharesOrValue: orderValueUSD,
        price: priceData.currentPrice,
        reason: `AutoExecute failed: ${msg}`,
        signal: { confidence: signal.confidence, reasoning: signal.reasoning, urgency: signal.urgency },
        timestamp: new Date().toISOString(),
        stopLoss: effectiveStopLoss,
        takeProfit: effectiveTakeProfit,
      }
    }
  }

  private async fetchAccountSnapshot() {
    try {
      return await fetchTradingAccountSnapshot()
    } catch {
      throw new Error('No se pudo obtener snapshot de cuenta')
    }
  }

  private async fetchPrice(ticker: string) {
    try {
      return await fetchTradingPrice(ticker)
    } catch (err) {
      const detail = err instanceof Error ? err.message : 'precio no disponible'
      throw new Error(`No se pudo obtener precio de ${ticker}: ${detail}`)
    }
  }

  private async fetchPosition(ticker: string) {
    try {
      return await fetchTradingPosition(ticker)
    } catch {
      return undefined
    }
  }

  /**
   * Solo ejecutable tras APPROVED.
   * When LIVE_TRADING_ENABLED=true and IBKR_READ_ONLY=false, completes IBKR proposal â†’ execute (TWS).
   * Smart plans: REAL submit remains LMT; bracket/VWAP/iceberg fields stay PLANNED in rationale.
   */
  private async executeOrder(params: {
    approvalId: string
    ticker: string
    direction: string
    shares: number
    orderType: string
    limitPrice?: number
    outsideRth?: boolean
    smartPlan?: {
      planId: string
      plannedFields: string[]
      realSubmitNote: string
      brokerSupportedNow: string
      icebergDisplayQty?: number
      vwapSliceCount?: number
    }
    stopLoss?: number
    takeProfit?: number
  }) {
    this.approvals.assertApproved(params.approvalId)

    if (params.smartPlan) {
      console.log(
        `[TradingEngine] SmartExecution REAL=LMT entry | PLANNED=[${params.smartPlan.plannedFields.join(', ')}] ` +
          `planId=${params.smartPlan.planId} support=${params.smartPlan.brokerSupportedNow}`,
      )
    }

    const flags = getInvestmentRuntimeFlags()
    if (!flags.liveTradingEnabled || flags.ibkrReadOnly) {
      console.warn(
        `[AutoExecute] ${params.ticker} PAPER (LIVE_TRADING_ENABLED=${flags.liveTradingEnabled} IBKR_READ_ONLY=${flags.ibkrReadOnly})`,
      )
      console.log('[TradingEngine] PAPER TRADE (post-approval, gate not OPEN):', {
        ...params,
        liveTradingEnabled: flags.liveTradingEnabled,
        ibkrReadOnly: flags.ibkrReadOnly,
        smartExecutionNote: params.smartPlan?.realSubmitNote,
      })
      return `PAPER_${Date.now()}`
    }

    const side = params.direction === 'SELL' ? 'SELL' : 'BUY'
    const account = process.env.IBKR_ACCOUNT_ID?.trim() || undefined
    console.log(
      `[AutoExecute] ${params.ticker} ${side} → llamando submitSupervisedLiveLimitOrder ` +
        `qty=${params.shares} limitSuggested=$${params.limitPrice ?? 'n/a'} account=${account ?? 'default'} outsideRth=${params.outsideRth ?? true}`,
    )

    let limitPrice: number
    try {
      limitPrice = await fetchLiveLimitPrice({
        symbol: params.ticker,
        side,
        asset: 'STK',
        suggested: params.limitPrice,
      })
      console.log(`[AutoExecute] ${params.ticker} → precio obtenido: $${limitPrice.toFixed(4)}`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`[AutoExecute] ${params.ticker} → ERROR: fetchLiveLimitPrice: ${msg}`)
      throw err
    }

    const plannedNote = params.smartPlan
      ? ` | SMART_PLAN ${params.smartPlan.planId} REAL=LMT PLANNED=${params.smartPlan.plannedFields.join(',')}` +
        ` SL=${params.stopLoss ?? 'n/a'} TP=${params.takeProfit ?? 'n/a'}` +
        (params.smartPlan.vwapSliceCount != null
          ? ` VWAP_slices=${params.smartPlan.vwapSliceCount}(PLANNED)`
          : '') +
        (params.smartPlan.icebergDisplayQty != null
          ? ` iceberg_display=${params.smartPlan.icebergDisplayQty}(PLANNED)`
          : '')
      : ''

    try {
      const submitted = await submitSupervisedLiveLimitOrder({
        symbol: String(params.ticker).toUpperCase(),
        side,
        quantity: Number(params.shares),
        limitPrice,
        outsideRth: params.outsideRth ?? true,
        rationale: `ForgeOS trading engine (approvalId=${params.approvalId})${plannedNote}`,
        account,
      })
      console.log(
        `[AutoExecute] ${params.ticker} → orden enviada ibkrId=${submitted.ibkrOrderId} proposal=${submitted.proposalId}`,
      )
      console.log('[TradingEngine] LIVE ORDER SUBMITTED:', {
        approvalId: params.approvalId,
        ticker: params.ticker,
        limitPrice,
        ibkrOrderId: submitted.ibkrOrderId,
        proposalId: submitted.proposalId,
      })
      return submitted.ibkrOrderId
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`[AutoExecute] ${params.ticker} → ERROR: ${msg}`)
      throw err
    }
  }

  private sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }
}
