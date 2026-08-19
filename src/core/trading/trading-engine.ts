/**
 * ForgeOS TradingEngine
 * Orquesta el ciclo completo: análisis IA → validación de riesgo → PENDING_APPROVAL → ejecución IBKR
 * Solo servidor (API routes) — llama IBKR FastAPI directamente, sin loopback HTTP a Next.js.
 */

import 'server-only'

import { RiskManager } from './risk/risk-manager'
import { TradingAgent } from './ai/trading-agent'
import { TRADING_CONFIG } from './trading.config'
import { OrderApprovalGate } from './order-approval'
import {
  evaluateAutoApproval,
  incrementAutoApprovalCount,
} from './auto-approval'
import { registerExecutedPosition } from './position-monitor'
import { getFullMarketAnalysis } from '@/lib/market-data/full-analysis'
import { aggregateSentiment, sentimentToAgentContext } from '@/lib/market-data/sentiment-aggregator'
import { getMacroContext, macroToAgentContext } from '@/lib/market-data/macro-context'
import { analyzeTimeframes, mtfToAgentContext } from '@/lib/market-data/multi-timeframe'
import { sendSignalAlert, notifyCircuitBreaker, notifyPreTradeHold } from '@/lib/notifications/telegram-bot'
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
import { getMarketSessionForExchange, getMarketSessionInfo, getUsMarketSession } from './market-session'
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
  private agent = new TradingAgent()
  private approvals = OrderApprovalGate.getInstance()

  private static readonly TICKER_TIMEOUT_MS = 5_000
  private static readonly MIN_DAILY_VOL_PCT = 3
  private static readonly MIN_DAILY_VOLUME = 1_000_000
  private static readonly MAX_SHARES_PER_ORDER = 10

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
   * Órdenes válidas quedan en PENDING_APPROVAL (no se ejecutan automáticamente).
   */
  async runCycle(tickers: string[]): Promise<TradeCycleResult> {
    const cycleId = `cycle_${Date.now()}`
    const startedAt = new Date().toISOString()
    const orders: OrderResult[] = []

    await expireStalePendingApprovals()

    // 1. Obtener snapshot de cuenta
    const account = await this.fetchAccountSnapshot()

    // 2. Verificar si ya está detenido
    if (this.risk.isHalted()) {
      return {
        cycleId, startedAt, completedAt: new Date().toISOString(),
        accountSnapshot: account, orders,
        systemHalted: true, haltReason: this.risk.getHaltReason(),
      }
    }

    // 3. Procesar tickers en paralelo (5s máx por ticker)
    const jobs = tickers.map(async (ticker) => {
      if (this.risk.isHalted()) return null
      try {
        const order = await TradingEngine.withTickerTimeout(
          this.processTicker(ticker, account),
          ticker,
        )
        if (order.status === 'PENDING_APPROVAL' && order.direction === 'BUY' && order.sharesOrValue) {
          account.cashUSD = Math.max(0, account.cashUSD - order.sharesOrValue)
        }
        return order
      } catch (err) {
        return {
          status: 'ERROR' as const,
          ticker,
          direction: 'HOLD' as const,
          reason: err instanceof Error ? err.message : 'Error desconocido',
          signal: { confidence: 0, reasoning: 'Error en ciclo', urgency: 'LOW' as const },
          timestamp: new Date().toISOString(),
        }
      }
    })
    const settled = await Promise.allSettled(jobs)
    for (const item of settled) {
      if (item.status === 'fulfilled' && item.value) orders.push(item.value)
    }

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
      if (!usSession.isTradeable) {
        return {
          status: 'HOLD', ticker, direction: 'HOLD',
          reason: `${ticker}: mercado USA cerrado (${usSession.sessionLabel})`,
          signal: { confidence: 0, reasoning: 'Fuera de horario USA', urgency: 'LOW' },
          timestamp: new Date().toISOString(),
        }
      }
    } else {
      const marketSession = getMarketSessionForExchange(quoteExchange, ticker)
      if (marketSession && !marketSession.isOpenNow) {
        return {
          status: 'HOLD', ticker, direction: 'HOLD',
          reason: `${ticker} (${marketSession.exchange}) fuera de horario local ${marketSession.sessionLabel} ${marketSession.timeZone}`,
          signal: { confidence: 0, reasoning: 'Mercado local cerrado', urgency: 'LOW' },
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
    const marketSession = usSession
      ? {
          exchange: 'SMART',
          timeZone: usSession.timeZone,
          sessionLabel: usSession.sessionLabel,
          localTime: usSession.localTime,
          isOpenNow: usSession.isTradeable,
          usPhase: usSession.phase,
        }
      : getMarketSessionForExchange(quoteExchange, ticker) ??
        getMarketSessionInfo(ticker, { quoteExchange })

    const usExtendedHours = usSession?.isExtendedHours ?? false

    const [analysis, sentimentAgg, macroCtx, mtf] = await Promise.all([
      getFullMarketAnalysis(ticker).catch(() => null),
      aggregateSentiment(ticker).catch(() => null),
      getMacroContext().catch(() => null),
      analyzeTimeframes(ticker).catch(() => null),
    ])

    const signal = await this.agent.analyzeAndSignal({
      ticker,
      currentPrice: priceData.currentPrice,
      change1d: priceData.change1d,
      high52w: priceData.high52w,
      low52w: priceData.low52w,
      volume: priceData.volume,
      bid: priceData.bid,
      ask: priceData.ask,
      marketSession,
      usExtendedHours,
      news: analysis
        ? {
            items: analysis.news.items.map((n) => ({
              title: n.title,
              source: n.source,
              sentiment: n.sentiment,
              hoursAgo: n.hoursAgo,
            })),
            overallSentiment: analysis.news.overallSentiment,
            newsCount24h: analysis.news.newsCount24h,
          }
        : undefined,
      sentiment: sentimentAgg ? sentimentToAgentContext(sentimentAgg) : undefined,
      macro: macroCtx ? macroToAgentContext(macroCtx) : undefined,
      multiTimeframe: mtf ? mtfToAgentContext(mtf) : undefined,
      technicals: analysis
        ? {
            trend: {
              ema20: analysis.technicals.trend.ema20,
              ema50: analysis.technicals.trend.ema50,
              ema200: analysis.technicals.trend.ema200,
              macd: analysis.technicals.trend.macd,
              ichimoku: analysis.technicals.trend.ichimoku
                ? {
                    aboveCloud: analysis.technicals.trend.ichimoku.aboveCloud,
                    tenkan: analysis.technicals.trend.ichimoku.tenkan,
                    kijun: analysis.technicals.trend.ichimoku.kijun,
                  }
                : null,
              adx: analysis.technicals.trend.adx,
            },
            momentum: analysis.technicals.momentum,
            volatility: {
              bollingerBands: analysis.technicals.volatility.bollingerBands,
              atr: analysis.technicals.volatility.atr,
              squeeze: analysis.technicals.volatility.squeeze,
            },
            volume: {
              vwap: analysis.technicals.volume.vwap,
              obv: analysis.technicals.volume.obv,
              relativeVolume: analysis.technicals.volume.relativeVolume,
            },
            levels: {
              fibonacci: [...analysis.technicals.levels.fibonacci],
              support: [...analysis.technicals.levels.support],
              resistance: [...analysis.technicals.levels.resistance],
            },
          }
        : undefined,
      patterns: analysis
        ? {
            candlesticks: [...analysis.patterns.candlesticks],
            price: [...analysis.patterns.price],
            divergences: [...analysis.patterns.divergences],
            signals: [...analysis.patterns.signals],
          }
        : undefined,
      portfolioContext: {
        navUSD: account.navUSD,
        cashUSD: account.cashUSD,
        dailyPnlUSD: account.dailyPnlUSD,
        existingPosition,
      },
    })

    // Phase K — weak multi-TF confluence: do not trade
    if (mtf?.doNotTrade && signal.direction !== 'HOLD') {
      return {
        status: 'HOLD',
        ticker,
        direction: 'HOLD',
        reason: `Señal débil multi-TF (${mtf.confluenceLabel}) — no operar`,
        signal: {
          confidence: signal.confidence,
          reasoning: `${signal.reasoning} | ${mtf.confluenceLabel}`,
          urgency: 'LOW',
        },
        timestamp: new Date().toISOString(),
      }
    }

    // Boost confidence when ≥3/4 TFs agree (cap at 1.0)
    if (mtf?.highConfidence && signal.direction !== 'HOLD') {
      signal.confidence = Math.min(1, Number((signal.confidence * 1.2).toFixed(3)))
    }
    recordSignalForTelegram({
      ticker,
      direction: signal.direction,
      confidence: signal.confidence,
      at: new Date().toISOString(),
    })

    if (signal.direction === 'HOLD') {
      return {
        status: 'HOLD', ticker, direction: 'HOLD',
        reason: signal.reasoning,
        signal: { confidence: signal.confidence, reasoning: signal.reasoning, urgency: signal.urgency },
        timestamp: new Date().toISOString(),
      }
    }

    // Intraday momentum + liquidity gates
    if (Math.abs(priceData.change1d) < TradingEngine.MIN_DAILY_VOL_PCT) {
      return {
        status: 'REJECTED_RISK',
        ticker,
        direction: signal.direction,
        reason: `Movimiento intradía ${priceData.change1d.toFixed(2)}% < ${TradingEngine.MIN_DAILY_VOL_PCT}%`,
        signal: { confidence: signal.confidence, reasoning: signal.reasoning, urgency: signal.urgency },
        timestamp: new Date().toISOString(),
      }
    }
    if ((priceData.volume ?? 0) < TradingEngine.MIN_DAILY_VOLUME) {
      return {
        status: 'REJECTED_RISK',
        ticker,
        direction: signal.direction,
        reason: `Volumen ${(priceData.volume ?? 0).toLocaleString()} < ${TradingEngine.MIN_DAILY_VOLUME.toLocaleString()}`,
        signal: { confidence: signal.confidence, reasoning: signal.reasoning, urgency: signal.urgency },
        timestamp: new Date().toISOString(),
      }
    }

    // Account-aware price filter (small accounts)
    const maxPriceForAccount = account.cashUSD < 25 ? 15 : 50
    if (priceData.currentPrice > maxPriceForAccount) {
      return {
        status: 'REJECTED_RISK',
        ticker,
        direction: signal.direction,
        reason: `Precio $${priceData.currentPrice.toFixed(2)} > umbral cuenta ($${maxPriceForAccount})`,
        signal: { confidence: signal.confidence, reasoning: signal.reasoning, urgency: signal.urgency },
        timestamp: new Date().toISOString(),
      }
    }

    const minConfidence = usExtendedHours
      ? TRADING_CONFIG.schedule.extendedHoursMinConfidence
      : TRADING_CONFIG.ai.minConfidenceToTrade

    if (signal.confidence < minConfidence) {
      return {
        status: 'REJECTED_CONFIDENCE', ticker, direction: signal.direction,
        reason: `Confianza ${(signal.confidence * 100).toFixed(0)}% < mínimo ${(minConfidence * 100).toFixed(0)}%${usExtendedHours ? ' (extended hours)' : ''}`,
        signal: { confidence: signal.confidence, reasoning: signal.reasoning, urgency: signal.urgency },
        timestamp: new Date().toISOString(),
      }
    }

    // Phase G — Portfolio optimizer (Kelly + correlation + defensive caps)
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
      return {
        status: 'REJECTED_RISK', ticker, direction: signal.direction,
        reason: riskCheck.reason,
        signal: { confidence: signal.confidence, reasoning: signal.reasoning, urgency: signal.urgency },
        timestamp: new Date().toISOString(),
      }
    }

    const orderValueUSD = riskCheck.maxOrderValueUSD
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
        reason: `Sin limitPrice para ${ticker} (IA y mercado vacíos)`,
        signal: { confidence: signal.confidence, reasoning: signal.reasoning, urgency: signal.urgency },
        timestamp: new Date().toISOString(),
      }
    }

    // Phase F — Pre-trade checklist gates PENDING_APPROVAL / auto-approve path
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
          stopLoss: riskCheck.stopLossPrice,
          takeProfit: riskCheck.takeProfitPrice,
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
        stopLoss: riskCheck.stopLossPrice,
        takeProfit: riskCheck.takeProfitPrice,
        atr: analysis?.technicals.volatility.atr ?? null,
      })
    }

    const effectiveStopLoss = smartPlan?.bracket?.stopLoss ?? riskCheck.stopLossPrice
    const effectiveTakeProfit = smartPlan?.bracket?.takeProfit ?? riskCheck.takeProfitPrice

    // PENDING_APPROVAL layer — evaluar auto-aprobación antes de encolar
    const topPattern =
      analysis?.patterns.candlesticks[0]?.name ??
      analysis?.patterns.price[0]?.name ??
      undefined

    const divergences = analysis?.patterns.divergences ?? []
    const hasConflictingDivergence =
      divergences.some((d) => d.type === 'BULLISH') &&
      divergences.some((d) => d.type === 'BEARISH')

    const approvalDecision = evaluateAutoApproval(signal.direction, {
      confidence: signal.confidence,
      orderValueUSD,
      news: analysis?.news ?? null,
      patterns: analysis?.patterns ?? null,
      rsi: analysis?.technicals.momentum.rsi ?? null,
      squeezeActive: analysis?.technicals.volatility.squeeze?.active ?? false,
      hasConflictingDivergence,
    })

    if (approvalDecision.action === 'HOLD') {
      return {
        status: 'HOLD', ticker, direction: 'HOLD',
        reason: approvalDecision.reason,
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
      outsideRth: usExtendedHours,
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

    // Phase H — record actionable signal for ML trainer (never places orders)
    void (async () => {
      try {
        const info = await getTickerInfo(ticker).catch(() => null)
        const patternSignals = analysis?.patterns.signals ?? []
        recordMlSignal({
          ticker,
          direction: signal.direction === 'SELL' ? 'SELL' : 'BUY',
          confidence: signal.confidence,
          pattern: topPattern ?? null,
          sector: info?.sector ?? null,
          vix: macroCtx?.vix.price ?? null,
          source: 'trading-engine',
          approvalId: pending.approvalId,
          indicators: {
            rsi: analysis?.technicals.momentum.rsi ?? null,
            squeezeActive: analysis?.technicals.volatility.squeeze?.active ?? false,
            relativeVolume: analysis?.technicals.volume.relativeVolume ?? null,
            macdHist: analysis?.technicals.trend.macd?.histogram ?? null,
            adx: analysis?.technicals.trend.adx ?? null,
            goldenCross: patternSignals.some((p) => p.name === 'Golden Cross'),
            deathCross: patternSignals.some((p) => p.name === 'Death Cross'),
          },
        })
      } catch (err) {
        console.warn(
          '[TradingEngine] recordMlSignal error:',
          err instanceof Error ? err.message : err,
        )
      }
    })()

    await sendSignalAlert({
      ticker,
      direction: signal.direction,
      entry: priceData.currentPrice,
      stopLoss: effectiveStopLoss,
      takeProfit: effectiveTakeProfit,
      confidence: signal.confidence,
      newsSentiment: analysis?.news.overallSentiment,
      rsi: analysis?.technicals.momentum.rsi,
      patternName: topPattern,
      approvalId: pending.approvalId,
      orderValueUSD,
      shares: resolvedShares,
      reasoning: signal.reasoning,
    }).catch((err) => {
      console.warn('[TradingEngine] sendSignalAlert error:', err instanceof Error ? err.message : err)
    })

    if (
      approvalDecision.action === 'AUTO_APPROVE' &&
      !TRADING_CONFIG.semiAutomatic.telegramApprovalRequired
    ) {
      incrementAutoApprovalCount()
      const executed = await this.approveAndExecute(pending.approvalId)
      return executed
    }

    return {
      approvalId: pending.approvalId,
      status: 'PENDING_APPROVAL',
      ticker,
      direction: signal.direction,
      sharesOrValue: orderValueUSD,
      price: priceData.currentPrice,
      reason: `Queued for approval: ${signal.reasoning}`,
      signal: { confidence: signal.confidence, reasoning: signal.reasoning, urgency: signal.urgency },
      timestamp: new Date().toISOString(),
      stopLoss: effectiveStopLoss,
      takeProfit: effectiveTakeProfit,
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
   * When LIVE_TRADING_ENABLED=true and IBKR_READ_ONLY=false, completes IBKR proposal → execute (TWS).
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
      console.log('[TradingEngine] PAPER TRADE (post-approval, gate not OPEN):', {
        ...params,
        liveTradingEnabled: flags.liveTradingEnabled,
        ibkrReadOnly: flags.ibkrReadOnly,
        smartExecutionNote: params.smartPlan?.realSubmitNote,
      })
      return `PAPER_${Date.now()}`
    }

    const side = params.direction === 'SELL' ? 'SELL' : 'BUY'
    const limitPrice = await fetchLiveLimitPrice({
      symbol: params.ticker,
      side,
      asset: 'STK',
      suggested: params.limitPrice,
    })

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

    const submitted = await submitSupervisedLiveLimitOrder({
      symbol: String(params.ticker).toUpperCase(),
      side,
      quantity: Number(params.shares),
      limitPrice,
      outsideRth: params.outsideRth ?? false,
      rationale: `ForgeOS trading engine (approvalId=${params.approvalId})${plannedNote}`,
      account: process.env.IBKR_ACCOUNT_ID?.trim() || undefined,
    })
    console.log('[TradingEngine] LIVE ORDER SUBMITTED:', {
      approvalId: params.approvalId,
      ticker: params.ticker,
      limitPrice,
      ibkrOrderId: submitted.ibkrOrderId,
      proposalId: submitted.proposalId,
    })
    return submitted.ibkrOrderId
  }

  private sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }
}
