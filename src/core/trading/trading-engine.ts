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
import { getMacroContext } from '@/lib/market-data/macro-context'
import { notifyPreTradeHold } from '@/lib/notifications/telegram-bot'
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
import { getDailyUniverse } from '@/lib/investment/market-daily-universe'
import { US_QUOTE_EXCHANGES } from '@/lib/trading/ticker-price-routes'
import { getUsMarketSession, selectTickersForOpenMarkets } from './market-session'
import { isIbkrCryptoTicker } from './crypto-ibkr'
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
import { shouldSkipUntradeableTicker } from './untradeable-tickers'
import { cancelStaleIbkrOrders } from '@/lib/trading/ibkr-reconnect'

/** Per-account capital policy — price band + 30% cash sizing. */
function resolveAccountCapitalPolicy(
  accountId: string | null | undefined,
  cashUSD: number,
): { accountId: string; minPrice: number; maxPrice: number; deployableUSD: number } {
  const id = String(accountId ?? '').trim().toUpperCase()
  const cash = Math.max(0, cashUSD)
  const deployableUSD = cash * 0.3
  // Ambas cuentas: cualquier precio accesible con capital ($0.10–$500)
  return { accountId: id, minPrice: 0.1, maxPrice: 500, deployableUSD }
}

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

  /** Analysis / strategy timeout — must NOT kill IBKR submit once auto-execute starts. */
  private static readonly TICKER_TIMEOUT_MS = 25_000
  /** Soft ceiling once submitSupervisedLiveLimitOrder is in flight. */
  private static readonly AUTO_EXECUTE_TIMEOUT_MS = 120_000
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

    // Cancel stuck PreSubmitted/Submitted (>5 min) before analyzing
    try {
      const stale = await cancelStaleIbkrOrders(300)
      if (stale.count > 0) {
        console.log(`[Cycle] Cancelando ${stale.count} órdenes PreSubmitted/Submitted antiguas...`)
        await new Promise((r) => setTimeout(r, 2000))
      }
    } catch (err) {
      console.warn('[Cycle] cancel stale failed:', err instanceof Error ? err.message : err)
    }

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

    // 3. Universo según mercados abiertos (Asia / Europa / USA)
    const scoped = selectTickersForOpenMarkets(tickers)
    if (scoped.tickers.length === 0) {
      console.log(
        `[ProStrategy] Ciclo ${cycleId}: sin tickers (ni crypto); solo monitor de posiciones`,
      )
      return {
        cycleId, startedAt, completedAt: new Date().toISOString(),
        accountSnapshot: account, orders,
        systemHalted: this.risk.isHalted(),
        haltReason: this.risk.isHalted() ? this.risk.getHaltReason() : undefined,
      }
    }
    const cycleTickers = scoped.tickers.length > 0 ? scoped.tickers : tickers
    console.log(
      `[ProStrategy] Ciclo ${cycleId}: modo=${scoped.mode} evaluando ${cycleTickers.length} tickers (concurrency=${TradingEngine.CYCLE_CONCURRENCY})`,
    )
    const jobs: Array<Promise<OrderResult | null>> = []
    const buySignalTickers = new Set<string>()
    let cursor = 0
    const worker = async (): Promise<void> => {
      while (cursor < cycleTickers.length) {
        if (this.risk.isHalted()) return
        const i = cursor++
        const ticker = cycleTickers[i]!
        jobs[i] = (async () => {
          const execGate = { enteredAutoExecute: false, buySignal: false }
          const work = this.processTicker(ticker, account, execGate)
          try {
            let order: OrderResult
            try {
              order = await TradingEngine.withTickerTimeout(work, ticker)
            } catch (timeoutErr) {
              // Critical: analysis timeout must NOT abort IBKR submit already in flight.
              if (execGate.enteredAutoExecute) {
                console.warn(
                  `[AutoExecute] ${ticker} → timeout de análisis ignorado; esperando submit IBKR (hasta ${TradingEngine.AUTO_EXECUTE_TIMEOUT_MS}ms)…`,
                )
                order = await TradingEngine.withTickerTimeout(
                  work,
                  ticker,
                  TradingEngine.AUTO_EXECUTE_TIMEOUT_MS,
                )
              } else {
                throw timeoutErr
              }
            }
            if (execGate.buySignal || order.direction === 'BUY') buySignalTickers.add(ticker)
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
            console.error(`[AutoExecute] ${ticker} → ERROR: ${msg} ❌`)
            if (execGate.buySignal || execGate.enteredAutoExecute) buySignalTickers.add(ticker)
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
      Array.from({ length: Math.min(TradingEngine.CYCLE_CONCURRENCY, Math.max(1, cycleTickers.length)) }, () =>
        worker(),
      ),
    )
    for (const job of jobs) {
      if (!job) continue
      const item = await job
      if (item) orders.push(item)
    }

    const señalesBuy = Math.max(
      buySignalTickers.size,
      orders.filter((o) => o.direction === 'BUY').length,
    )
    const autoEjecutadas = orders.filter((o) => o.status === 'EXECUTED' && o.direction === 'BUY').length
    const fallidas = Math.max(
      0,
      señalesBuy - autoEjecutadas - orders.filter((o) => o.direction === 'BUY' && o.status === 'PENDING_APPROVAL').length,
    )
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

    if (approved.direction === 'BUY') {
      const entry = approved.price > 0 ? approved.price : approved.limitPrice ?? 0
      const stopLoss =
        approved.stopLoss && approved.stopLoss > 0
          ? approved.stopLoss
          : entry > 0
            ? entry * 0.97
            : 0
      const takeProfit =
        approved.takeProfit && approved.takeProfit > 0
          ? approved.takeProfit
          : entry > 0
            ? entry * 1.05
            : 0
      await registerExecutedPosition({
        ticker: approved.ticker,
        shares: approved.shares,
        entryPrice: entry,
        stopLoss,
        takeProfit,
        orderId,
        trailingStopPct: approved.smartPlan?.trailingStopPct,
        account: process.env.IBKR_ACCOUNT_ID?.trim() || undefined,
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

  private async processTicker(
    ticker: string,
    account: {
      navUSD: number
      cashUSD: number
      dailyPnlUSD: number
      openPositionsCount: number
      primaryAccountId?: string | null
    },
    execGate?: { enteredAutoExecute: boolean; buySignal: boolean },
  ): Promise<OrderResult> {
    if (shouldSkipUntradeableTicker(ticker)) {
      console.log(`[AutoExecute] ${ticker} → skip permanente (junk / .OLD / .CVR)`)
      return {
        status: 'HOLD',
        ticker,
        direction: 'HOLD',
        reason: `${ticker}: ticker excluido (sin precio FMP / heredado)`,
        signal: { confidence: 0, reasoning: 'Untradeable inherited ticker', urgency: 'LOW' },
        timestamp: new Date().toISOString(),
      }
    }

    console.log(`[AutoExecute] ${ticker} → obteniendo precio actual…`)
    let priceData: Awaited<ReturnType<typeof fetchTradingPrice>>
    try {
      priceData = await this.fetchPrice(ticker)
      console.log(`[AutoExecute] ${ticker} → precio: $${priceData.currentPrice.toFixed(2)}`)
    } catch (err) {
      const screener = getDailyUniverse()?.tickers.find((t) => t.symbol === ticker.toUpperCase())
      if (screener && screener.price > 0) {
        console.warn(
          `[AutoExecute] ${ticker} → precio live falló; usando screener $${screener.price.toFixed(2)}`,
        )
        priceData = {
          ticker,
          currentPrice: screener.price,
          previousClose: screener.price,
          bid: screener.price,
          ask: screener.price,
          change1d: screener.changePct,
          high52w: screener.price,
          low52w: screener.price,
          volume: screener.volume,
          changePercentage: screener.changePct,
          quoteSymbol: ticker,
          quoteExchange: 'SMART',
          quoteCurrency: 'USD',
          quoteRoute: 'screener-cache',
          quoteErrors: ['live-price-fallback-screener'],
        }
      } else {
        throw err
      }
    }

    if (shouldSkipUntradeableTicker(ticker, priceData.currentPrice)) {
      console.log(`[AutoExecute] ${ticker} → skip precio $0.00 / no operable`)
      return {
        status: 'HOLD',
        ticker,
        direction: 'HOLD',
        reason: `${ticker}: precio $0.00 o ticker excluido`,
        signal: { confidence: 0, reasoning: 'Zero price / untradeable', urgency: 'LOW' },
        timestamp: new Date().toISOString(),
      }
    }

    const quoteExchange = priceData.quoteExchange ?? 'SMART'
    const usSession = !isIbkrCryptoTicker(ticker) && US_QUOTE_EXCHANGES.has(quoteExchange.toUpperCase())
      ? getUsMarketSession()
      : null

    if (usSession) {
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
        reason: `${ticker}: ya existe posición abierta (diversificación 1 posición por ticker)`,
        signal: { confidence: 0, reasoning: 'Ticker already open', urgency: 'LOW' },
        timestamp: new Date().toISOString(),
      }
    }
    // Regular RTH: outside_rth=false; pre/after/closed extended: outside_rth=true
    const usExtendedHours = usSession ? usSession.isExtendedHours : true

    // Mixed technical strategies (EOD + live profile)
    const change1dPct =
      priceData.changePercentage ||
      (priceData.previousClose > 0
        ? ((priceData.currentPrice - priceData.previousClose) / priceData.previousClose) * 100
        : 0)
    const strategy = await evaluateProStrategies(ticker, {
      price: priceData.currentPrice,
      change1dPct,
      volume: priceData.volume,
      yearHigh: priceData.high52w,
      yearLow: priceData.low52w,
      priceAvg50: priceData.priceAvg50,
      priceAvg200: priceData.priceAvg200,
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

    if (execGate) execGate.buySignal = true

    recordSignalForTelegram({
      ticker,
      direction: signal.direction,
      confidence: signal.confidence,
      at: new Date().toISOString(),
    })

    // Account-aware price filter (capital policy by IBKR account)
    const capital = resolveAccountCapitalPolicy(
      account.primaryAccountId ?? process.env.IBKR_ACCOUNT_ID,
      account.cashUSD,
    )
    if (priceData.currentPrice < capital.minPrice || priceData.currentPrice > capital.maxPrice) {
      console.warn(
        `[AutoExecute] ${ticker} BLOCKED: precio $${priceData.currentPrice.toFixed(2)} fuera de rango ` +
          `$${capital.minPrice}-$${capital.maxPrice} (cuenta ${capital.accountId || 'default'})`,
      )
      return {
        status: 'REJECTED_RISK',
        ticker,
        direction: signal.direction,
        reason: `Precio $${priceData.currentPrice.toFixed(2)} fuera de rango cuenta $${capital.minPrice}-$${capital.maxPrice}`,
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
    // Sizing dinámico: qty = floor(cash * 0.3 / precio), mínimo 1
    let resolvedShares = Math.floor(
      (capital.deployableUSD * (strategy.positionSizeFactor ?? 1)) / priceData.currentPrice,
    )
    console.log(
      `[AutoExecute] ${ticker} → cash disponible: $${account.cashUSD.toFixed(2)} | 30%: $${capital.deployableUSD.toFixed(2)} | precio: $${priceData.currentPrice.toFixed(2)} | qty: ${resolvedShares}`,
    )
    if (resolvedShares <= 0) {
      console.warn(`[AutoExecute] ${ticker} → capital insuficiente (qty=0) — skip`)
      return {
        status: 'REJECTED_RISK',
        ticker,
        direction: signal.direction,
        reason: `capital insuficiente — cash $${account.cashUSD.toFixed(2)} precio $${priceData.currentPrice.toFixed(2)}`,
        signal: { confidence: signal.confidence, reasoning: signal.reasoning, urgency: signal.urgency },
        timestamp: new Date().toISOString(),
      }
    }
    resolvedShares = Math.max(1, resolvedShares)
    console.log(
      `[AutoExecute] ${ticker} BUY qty=${resolvedShares} precio=$${priceData.currentPrice.toFixed(2)} ` +
        `SL=$${riskOk.stopLossPrice.toFixed(2)} TP=$${riskOk.takeProfitPrice.toFixed(2)}`,
    )

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
        status: 'HOLD', ticker, direction: 'BUY',
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
          direction: 'BUY',
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
    console.log(
      `[AutoExecute] ${ticker} BUY qty=${resolvedShares} precio=$${priceData.currentPrice.toFixed(2)} ` +
        `SL=$${effectiveStopLoss.toFixed(2)} TP=$${effectiveTakeProfit.toFixed(2)}`,
    )

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
      outsideRth: isIbkrCryptoTicker(ticker) ? true : usExtendedHours,
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
            goldenCross: strategy.strategyIds.includes('GOLDEN_CROSS_MOMENTUM'),
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
    if (execGate) execGate.enteredAutoExecute = true
    console.log(`[Signal] ${ticker} → auto-ejecutar`)
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
          `[AutoExecute] ${ticker} → EJECUTADO ibkrId=${executed.orderId ?? 'n/a'} ✅`,
        )
        // Telegram immediate alert via registerExecutedPosition → notifyOrderExecuted
      } else {
        console.warn(
          `[AutoExecute] ${ticker} → ERROR: no EXECUTED status=${executed.status} reason=${executed.reason} ❌`,
        )
      }
      return executed
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`[AutoExecute] ${ticker} → ERROR: ${msg} ❌`)
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
        outsideRth: isIbkrCryptoTicker(params.ticker) ? true : params.outsideRth ?? true,
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
