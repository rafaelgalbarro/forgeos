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
import { evaluateProStrategies, capitalPctFromConfidence } from './strategies/pro-strategies'
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
import {
  IbkrSubmitTimeoutError,
  submitSupervisedLiveLimitOrder,
} from '@/lib/investment/ibkr-supervised-submit'
import { US_QUOTE_EXCHANGES } from '@/lib/trading/ticker-price-routes'
import {
  getUsMarketSession,
  selectTickersForOpenMarkets,
  isUsaPremarketPrepareOnly,
  getActiveTradingPhase,
  ASIA_ETF_TICKERS,
  EUROPE_ETF_TICKERS,
} from './market-session'
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
import { ibkrCacheKey, peekIbkrCached } from '@/lib/trading/ibkr-cache'
import type { TradingPriceSnapshot } from '@/lib/trading/ibkr-data'
import { peekIbkrPriceCache } from '@/lib/market-data/ibkr-prices'
import {
  isPremarketHighPriority,
  listPremarketCandidates,
  peekPremarketCandidate,
} from '@/lib/investment/premarket-candidates'
import {
  ensureDailyUniverse,
  getDailyUniverse,
} from '@/lib/investment/market-daily-universe'
import { getScannerCandidateTickers } from '@/lib/investment/cycle-universe'
import { getActiveCandidateTickers } from '@/lib/market-data/candidate-store'

/** Analyze up to 100 tickers per cycle across all sessions. */
function maxCycleTickers(): number {
  return 100
}

const GLOBAL_ETF_PRIORITY = new Set<string>([
  ...ASIA_ETF_TICKERS,
  ...EUROPE_ETF_TICKERS,
])

function hasWarmIbkrPrice(ticker: string): boolean {
  const live = peekIbkrPriceCache(ticker)
  if (live && live.price > 0) return true
  const snap = peekIbkrCached<TradingPriceSnapshot>(ibkrCacheKey('price', ticker))
  return Boolean(snap?.value && snap.value.currentPrice > 0)
}

/**
 * Prioritize: premarket HIGH → IBKR gainers → IBKR actives → crypto → ETFs → resto.
 */
function prioritizeCycleTickers(tickers: readonly string[]): string[] {
  const cap = maxCycleTickers()
  const unique = [...new Set(tickers.map((t) => t.trim().toUpperCase()).filter(Boolean))]
  const premarketHigh = listPremarketCandidates().map((c) => c.symbol)
  const preSet = new Set(premarketHigh)

  const gainerSet = new Set<string>()
  const activeSet = new Set<string>()
  const daily = getDailyUniverse()
  for (const t of daily?.tickers ?? []) {
    if (t.sources.some((s) => s.includes('top_perc_gain') || s.includes('hot_by'))) {
      gainerSet.add(t.symbol)
    }
    if (t.sources.some((s) => s.includes('most_active') || s.includes('hot_by_volume'))) {
      activeSet.add(t.symbol)
    }
  }

  const withPremarket: string[] = []
  const gainers: string[] = []
  const actives: string[] = []
  const crypto: string[] = []
  const etfs: string[] = []
  const rest: string[] = []

  for (const t of unique) {
    if (preSet.has(t) || isPremarketHighPriority(t)) withPremarket.push(t)
    else if (gainerSet.has(t)) gainers.push(t)
    else if (activeSet.has(t)) actives.push(t)
    else if (isIbkrCryptoTicker(t)) crypto.push(t)
    else if (GLOBAL_ETF_PRIORITY.has(t)) etfs.push(t)
    else rest.push(t)
  }

  const orderedPremarket = [
    ...premarketHigh.filter((t) => unique.includes(t)),
    ...withPremarket.filter((t) => !preSet.has(t)),
  ]
  // Prefer warm IBKR within each bucket
  const sortWarm = (list: string[]) =>
    [...list].sort((a, b) => Number(hasWarmIbkrPrice(b)) - Number(hasWarmIbkrPrice(a)))

  return [
    ...new Set([
      ...orderedPremarket,
      ...sortWarm(gainers),
      ...sortWarm(actives),
      ...crypto,
      ...etfs,
      ...sortWarm(rest),
    ]),
  ].slice(0, cap)
}

/** Temporary skip after IBKR/AutoExecute timeout — 30 minutes. */
const TIMEOUT_SKIP_TTL_MS = 30 * 60_000
const timeoutSkipUntil = new Map<string, number>()

function markTimeoutSkip(ticker: string): void {
  const key = ticker.trim().toUpperCase()
  if (!key) return
  timeoutSkipUntil.set(key, Date.now() + TIMEOUT_SKIP_TTL_MS)
}

function isTimeoutSkipped(ticker: string): boolean {
  const key = ticker.trim().toUpperCase()
  const until = timeoutSkipUntil.get(key)
  if (until == null) return false
  if (Date.now() >= until) {
    timeoutSkipUntil.delete(key)
    return false
  }
  return true
}

function isTimeoutFailure(err: unknown): boolean {
  if (err instanceof IbkrSubmitTimeoutError) return true
  const msg = err instanceof Error ? err.message : String(err)
  return /timeout|timed?\s*out|AbortError|aborted|ETIMEDOUT|skip \(timeout IBKR\)/i.test(msg)
}

function timeoutSkipResult(ticker: string, detail?: string): OrderResult {
  markTimeoutSkip(ticker)
  return {
    status: 'SKIPPED',
    ticker,
    direction: 'HOLD',
    reason: detail?.trim() || `${ticker}: skip (timeout IBKR)`,
    signal: { confidence: 0, reasoning: 'Timeout IBKR — skip temporal 30m', urgency: 'LOW' },
    timestamp: new Date().toISOString(),
  }
}

/** Per-account capital policy — price band + confidence-tier cash sizing. */
function resolveAccountCapitalPolicy(
  accountId: string | null | undefined,
  cashUSD: number,
  confidence = 0.68,
  sizeFactor = 1,
): { accountId: string; minPrice: number; maxPrice: number; deployableUSD: number; capitalPct: number } {
  const id = String(accountId ?? '').trim().toUpperCase()
  const cash = Math.max(0, cashUSD)
  const capitalPct = capitalPctFromConfidence(confidence) * Math.max(0.1, Math.min(1, sizeFactor))
  const deployableUSD = cash * capitalPct
  return { accountId: id, minPrice: 0.75, maxPrice: 500, deployableUSD, capitalPct }
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
    | 'SKIPPED'
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

/** Max wall-clock for one trading cycle (100 tickers @ concurrency 10). */
export const CYCLE_TIMEOUT_MS = 3 * 60 * 1000

export class TradingEngine {
  private risk = RiskManager.getInstance()
  private approvals = OrderApprovalGate.getInstance()

  /** Per-ticker analysis + price fetch — skip fast if IBKR slow. */
  private static readonly TICKER_TIMEOUT_MS = 5_000
  /** Once live submit started, allow longer for IBKR ack. */
  private static readonly AUTO_EXECUTE_TIMEOUT_MS = 60_000
  private static readonly CYCLE_CONCURRENCY = 10

  private static cycleLock = { running: false, startedAt: 0, cycleId: '' as string }

  /** Acquire cycle mutex; force-release if previous cycle exceeded CYCLE_TIMEOUT_MS. */
  static tryAcquireCycle(): boolean {
    const now = Date.now()
    if (
      TradingEngine.cycleLock.running &&
      now - TradingEngine.cycleLock.startedAt > CYCLE_TIMEOUT_MS
    ) {
      console.warn(
        `[TradingCycle] Mutex bloqueado >${CYCLE_TIMEOUT_MS / 60_000}m — liberando ciclo ${TradingEngine.cycleLock.cycleId || 'unknown'}`,
      )
      TradingEngine.releaseCycle()
    }
    if (TradingEngine.cycleLock.running) return false
    TradingEngine.cycleLock = { running: true, startedAt: now, cycleId: '' }
    return true
  }

  static releaseCycle(): void {
    TradingEngine.cycleLock = { running: false, startedAt: 0, cycleId: '' }
  }

  static isCycleRunning(): boolean {
    return TradingEngine.cycleLock.running
  }

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
   * IBKR scanner universe is primary. MarketScanner is an optional overlay — never blocks the cycle.
   */
  private async resolveCycleSeedTickers(tickers: string[]): Promise<string[]> {
    const seed = [
      ...new Set(tickers.map((t) => t.trim().toUpperCase()).filter(Boolean)),
    ]

    let ibkr = (getDailyUniverse()?.tickers ?? []).map((t) => t.symbol.toUpperCase())
    if (ibkr.length === 0) {
      try {
        const refreshed = await ensureDailyUniverse()
        ibkr = refreshed.tickers.map((t) => t.symbol.toUpperCase())
      } catch (err) {
        console.warn(
          '[TradingCycle] ensureDailyUniverse failed:',
          err instanceof Error ? err.message : err,
        )
      }
    }

    const scannerPool = [
      ...new Set(
        [...getActiveCandidateTickers(), ...getScannerCandidateTickers()]
          .map((t) => t.trim().toUpperCase())
          .filter(Boolean),
      ),
    ]

    if (scannerPool.length === 0) {
      const direct = [...new Set([...ibkr, ...seed])].slice(0, maxCycleTickers())
      console.log(
        `[TradingCycle] MarketScanner sin candidatos → usando universo IBKR directo (${direct.length} tickers)`,
      )
      return direct.length > 0 ? direct : seed
    }

    const merged = [...new Set([...ibkr, ...seed, ...scannerPool])].slice(0, maxCycleTickers())
    return merged.length > 0 ? merged : seed
  }

  /**
   * Ejecuta un ciclo de trading completo para una lista de tickers.
   * Llamado por el API route de Next.js cada X minutos.
   * Ã“rdenes vÃ¡lidas quedan en PENDING_APPROVAL (no se ejecutan automÃ¡ticamente).
   */
  async runCycle(tickers: string[]): Promise<TradeCycleResult> {
    if (!TradingEngine.tryAcquireCycle()) {
      throw new Error('cycle already running')
    }

    const cycleId = `cycle_${Date.now()}`
    TradingEngine.cycleLock.cycleId = cycleId
    const startedAt = new Date().toISOString()

    try {
      return await Promise.race([
        this.runCycleBody(tickers, cycleId, startedAt),
        new Promise<TradeCycleResult>((_, reject) => {
          setTimeout(
            () => reject(new Error(`Ciclo timeout ${CYCLE_TIMEOUT_MS}ms`)),
            CYCLE_TIMEOUT_MS,
          )
        }),
      ])
    } finally {
      TradingEngine.releaseCycle()
    }
  }

  private async runCycleBody(
    tickers: string[],
    cycleId: string,
    startedAt: string,
  ): Promise<TradeCycleResult> {
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

    // 3. Universo: MarketScanner opcional → si pool=0, IBKR scanner directo
    const seedTickers = await this.resolveCycleSeedTickers(tickers)
    const scoped = selectTickersForOpenMarkets(seedTickers)
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
    const cycleTickers = prioritizeCycleTickers(
      scoped.tickers.length > 0 ? scoped.tickers : seedTickers,
    )
    console.log(
      `[ProStrategy] Ciclo ${cycleId}: modo=${scoped.mode} evaluando ${cycleTickers.length}/${scoped.tickers.length} tickers ` +
        `(max=${maxCycleTickers()}, precios=IBKR, concurrency=${TradingEngine.CYCLE_CONCURRENCY})`,
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
                try {
                  order = await TradingEngine.withTickerTimeout(
                    work,
                    ticker,
                    TradingEngine.AUTO_EXECUTE_TIMEOUT_MS,
                  )
                } catch (submitTimeout) {
                  if (isTimeoutFailure(submitTimeout)) {
                    console.log(`[AutoExecute] ${ticker} → skip (timeout IBKR)`)
                    return timeoutSkipResult(
                      ticker,
                      submitTimeout instanceof Error ? submitTimeout.message : undefined,
                    )
                  }
                  throw submitTimeout
                }
              } else if (isTimeoutFailure(timeoutErr)) {
                console.log(`[AutoExecute] ${ticker} → skip (timeout IBKR)`)
                return timeoutSkipResult(
                  ticker,
                  timeoutErr instanceof Error ? timeoutErr.message : undefined,
                )
              } else {
                throw timeoutErr
              }
            }
            // Timeout skips are silent — do not count as BUY señales / fallidas
            if (order.status !== 'SKIPPED') {
              if (execGate.buySignal || order.direction === 'BUY') buySignalTickers.add(ticker)
            }
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
            if (isTimeoutFailure(err)) {
              console.log(`[AutoExecute] ${ticker} → skip (timeout IBKR)`)
              return timeoutSkipResult(ticker, err instanceof Error ? err.message : undefined)
            }
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
      orders.filter((o) => o.direction === 'BUY' && o.status !== 'SKIPPED').length,
    )
    const autoEjecutadas = orders.filter((o) => o.status === 'EXECUTED' && o.direction === 'BUY').length
    const fallidas = Math.max(
      0,
      señalesBuy -
        autoEjecutadas -
        orders.filter((o) => o.direction === 'BUY' && o.status === 'PENDING_APPROVAL').length,
    )
    const skippedTimeout = orders.filter((o) => o.status === 'SKIPPED').length
    console.log(
      `[ProStrategy] Ciclo fin: ${orders.length} tickers | señales BUY=${señalesBuy} | auto-ejecutadas=${autoEjecutadas} | fallidas=${fallidas}` +
        (skippedTimeout ? ` | skip-timeout=${skippedTimeout}` : ''),
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

      // Solo registrar tras Filled IBKR (sin Telegram inmediato)
      const oid = String(orderId ?? '')
      const isPaper = oid.toUpperCase().startsWith('PAPER_') || !oid || oid.toLowerCase() === 'n/a'
      if (isPaper) {
        console.log(`[AutoExecute] ${approved.ticker} PAPER — sin registro SQLite/Telegram`)
      } else {
        const { waitForIbkrFill } = await import('@/lib/investment/ibkr-fill-confirm')
        const fill = await waitForIbkrFill({
          ibkrOrderId: oid,
          symbol: approved.ticker,
          side: 'BUY',
        })
        if (fill.outcome === 'filled') {
          const fillPx = fill.avgFillPrice && fill.avgFillPrice > 0 ? fill.avgFillPrice : entry
          await registerExecutedPosition({
            ticker: approved.ticker,
            shares: approved.shares,
            entryPrice: fillPx,
            stopLoss,
            takeProfit,
            orderId: oid,
            trailingStopPct: approved.smartPlan?.trailingStopPct,
            account: process.env.IBKR_ACCOUNT_ID?.trim() || undefined,
          })
          console.log(`[AutoExecute] ${approved.ticker} → Filled ibkrId=${oid} registrado`)
        } else {
          console.warn(
            `[AutoExecute] ${approved.ticker} → NO registrar (fill=${fill.outcome} status=${fill.status})`,
          )
          return {
            orderId: oid,
            approvalId,
            status: 'ERROR',
            ticker: approved.ticker,
            direction: approved.direction,
            sharesOrValue: approved.orderValueUSD,
            price: approved.price,
            reason: `IBKR no Filled: ${fill.outcome}/${fill.status}`,
            signal: approved.signal,
            timestamp: new Date().toISOString(),
            stopLoss: approved.stopLoss,
            takeProfit: approved.takeProfit,
          }
        }
      }
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
    if (isTimeoutSkipped(ticker)) {
      console.log(`[AutoExecute] ${ticker} → skip (timeout IBKR, lista temporal 30m)`)
      return {
        status: 'SKIPPED',
        ticker,
        direction: 'HOLD',
        reason: `${ticker}: skip temporal post-timeout IBKR`,
        signal: { confidence: 0, reasoning: 'Timeout skip list 30m', urgency: 'LOW' },
        timestamp: new Date().toISOString(),
      }
    }

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

    console.log(`[AutoExecute] ${ticker} → obteniendo precio IBKR…`)
    let priceData: Awaited<ReturnType<typeof fetchTradingPrice>>
    try {
      priceData = await this.fetchPrice(ticker)
      console.log(
        `[AutoExecute] ${ticker} → precio: $${priceData.currentPrice.toFixed(2)} (${priceData.quoteRoute})`,
      )
    } catch {
      console.log(`[Universe] ${ticker} sin precio IBKR, skip`)
      return {
        status: 'SKIPPED',
        ticker,
        direction: 'HOLD',
        reason: `${ticker}: sin precio IBKR (ticker no reconocido / sin cotización)`,
        signal: { confidence: 0, reasoning: 'Sin precio IBKR — skip silencioso', urgency: 'LOW' },
        timestamp: new Date().toISOString(),
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
    const pm = peekPremarketCandidate(ticker)
    const strategy = await evaluateProStrategies(ticker, {
      price: priceData.currentPrice,
      change1dPct: pm && Math.abs(pm.gapPct) > Math.abs(change1dPct) ? pm.gapPct : change1dPct,
      volume: Math.max(priceData.volume, pm?.volume ?? 0),
      yearHigh: priceData.high52w,
      yearLow: priceData.low52w,
      priceAvg50: priceData.priceAvg50,
      priceAvg200: priceData.priceAvg200,
      premarketCandidate: Boolean(pm) || isPremarketHighPriority(ticker),
      gapHeldMs: pm ? Date.now() - pm.firstSeenAtMs : undefined,
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

    // USA premarket 14:00–14:30: prepare only — no execute
    if (isUsaPremarketPrepareOnly() && !isIbkrCryptoTicker(ticker)) {
      console.log(`[AutoExecute] ${ticker} → Premarket prepare-only (no ejecutar aún)`)
      return {
        status: 'HOLD',
        ticker,
        direction: 'HOLD',
        reason: `${ticker}: premarket — candidato preparado, ejecución en apertura`,
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

    // Account-aware price filter + confidence-tier sizing
    const capital = resolveAccountCapitalPolicy(
      account.primaryAccountId ?? process.env.IBKR_ACCOUNT_ID,
      account.cashUSD,
      signal.confidence,
      strategy.positionSizeFactor ?? 1,
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

    // Hard cap: máx 5 posiciones abiertas
    if (
      signal.direction === 'BUY' &&
      account.openPositionsCount >= TRADING_CONFIG.risk.maxOpenPositions
    ) {
      return {
        status: 'REJECTED_RISK',
        ticker,
        direction: signal.direction,
        reason: `Máximo ${TRADING_CONFIG.risk.maxOpenPositions} posiciones abiertas (${account.openPositionsCount})`,
        signal: { confidence: signal.confidence, reasoning: signal.reasoning, urgency: signal.urgency },
        timestamp: new Date().toISOString(),
      }
    }

    const phase = getActiveTradingPhase()
    const minConfidence =
      phase === 'USA_AFTERHOURS'
        ? (TRADING_CONFIG.ai.minConfidenceExtendedHours ?? 0.75)
        : TRADING_CONFIG.ai.minConfidenceToTrade

    if (signal.confidence < minConfidence) {
      return {
        status: 'REJECTED_CONFIDENCE', ticker, direction: signal.direction,
        reason: `Confianza ${(signal.confidence * 100).toFixed(0)}% < mínimo ${(minConfidence * 100).toFixed(0)}% (${phase})`,
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
    // Sizing: conf tier 15–30% cash × VIX factor
    let resolvedShares = Math.floor(capital.deployableUSD / priceData.currentPrice)
    console.log(
      `[AutoExecute] ${ticker} → cash $${account.cashUSD.toFixed(2)} | sizing ${(capital.capitalPct * 100).toFixed(0)}%: $${capital.deployableUSD.toFixed(2)} | precio $${priceData.currentPrice.toFixed(2)} | qty ${resolvedShares}`,
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
            goldenCross: strategy.strategyIds.some(
              (id) => id === "ASIA_GOLDEN_CROSS" || id === "CRYPTO_GOLDEN_CROSS",
            ),
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
        const oid = executed.orderId ?? ''
        const confirmed =
          Boolean(oid) &&
          !String(oid).toUpperCase().startsWith('PAPER_') &&
          String(oid).toLowerCase() !== 'n/a'
        if (confirmed) {
          console.log(`[AutoExecute] ${ticker} → EJECUTADO ibkrId=${oid} ✅`)
        } else {
          console.warn(
            `[AutoExecute] ${ticker} → EXECUTED sin ibkrId confirmado (orderId=${oid || 'n/a'}) — sin Telegram`,
          )
        }
        // Telegram solo desde registerExecutedPosition cuando ibkrId es real
      } else if (executed.status === 'SKIPPED') {
        return executed
      } else {
        console.warn(
          `[AutoExecute] ${ticker} → ERROR: no EXECUTED status=${executed.status} reason=${executed.reason} ❌`,
        )
      }
      return executed
    } catch (err) {
      if (isTimeoutFailure(err)) {
        console.log(`[AutoExecute] ${ticker} → skip (timeout IBKR)`)
        return timeoutSkipResult(ticker, err instanceof Error ? err.message : undefined)
      }
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
      if (isTimeoutFailure(err)) {
        console.log(`[AutoExecute] ${params.ticker} → skip (timeout IBKR)`)
        throw err instanceof IbkrSubmitTimeoutError
          ? err
          : new IbkrSubmitTimeoutError(
              params.ticker,
              err instanceof Error ? err.message : String(err),
            )
      }
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`[AutoExecute] ${params.ticker} → ERROR: ${msg}`)
      throw err
    }
  }

  private sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }
}
