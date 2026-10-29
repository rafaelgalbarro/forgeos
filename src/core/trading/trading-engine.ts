/**
 * ForgeOS TradingEngine
 * Orquesta el ciclo completo: anÃ¡lisis IA â†’ validaciÃ³n de riesgo â†’ PENDING_APPROVAL â†’ ejecuciÃ³n IBKR
 * Solo servidor (API routes) â€” llama IBKR FastAPI directamente, sin loopback HTTP a Next.js.
 */

import { ibkrCostGate } from '@/lib/trading/costs/ibkr-stock-costs'
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
import {
  notifyPreTradeHold,
  notifyPendingApproval,
  notifyInstantExecution,
  sendTelegramMessage,
} from '@/lib/notifications/telegram-bot'
import { runPreOrderRiskCheck, logPreOrderDecision } from '@/lib/trading/agents'
import {
  fetchCapitalSnapshot,
  fetchCapitalSnapshotForAccount,
  pickIbkrAccountWithMostUsd,
  pickIbkrStockAccountCapital,
  type StockAccountCapitalPick,
} from '@/lib/trading/capital'
import {
  isIbkrExecutableEquity,
  isIbkrNonExecutableUsEtf,
} from '@/lib/trading/usa-sectors'
import { isUsStockTicker } from '@/lib/trading/stocks-universe'
import {
  getIbkrNonTradableEntry,
  isIbkrNonTradable,
  recordIbkrNonTradable,
  shouldPersistIbkrNonTradable,
} from '@/lib/trading/ibkr-non-tradable'
import {
  getStocksExecutionPauseReason,
  isStocksExecutionEnabled,
  isStocksExecutionEuEnabled,
  isStocksExecutionPremarketEnabled,
  isStocksExecutionUsEnabled,
  isSymbolBrokerBrakedToday,
  stocksExecutionPausedUntil,
} from '@/lib/trading/stocks-execution-gate'
import { isOtcPinkNonExecutable } from '@/lib/trading/otc-pink'
import {
  getCurrentTradingPhase,
  isEuropeanEquityOrderWindow,
  isUsListedEquityOrderWindow,
} from '@/lib/trading/cycle-schedule'
import { isUsPremarketSession } from '@/lib/trading/exchange-hours'
import {
  assertPremarketLiveGates,
  getPremarketLiveReadiness,
  isPremarketLiveReady,
  isUsablePremarketQuote,
  premarketLimitPrice,
  PREMARKET_SIZE_FACTOR,
  listPendingPremarketShadowTickers,
  recordPremarketShadowSignal,
  resolvePremarketShadowAtClose,
  resolvePremarketShadowAtOpen,
} from '@/lib/trading/us-premarket'
import { ibkrEurStocksAccountId, isEuropeanEurEquity } from '@/lib/trading/europe-equities'
import {
  getEquityStrategySession,
  isEuropeanEurEquityRegularSession,
  minConfidencePhaseForSession,
} from '@/lib/trading/equity-strategy-session'
import { recordSignalForTelegram } from '@/lib/notifications/telegram-handler'
import {
  applyInPlayShareCap,
  gateStocksDynamicCategories,
} from '@/lib/trading/stocks-in-play/cycle-hooks'
import { inPlaySymbolSet } from '@/lib/trading/stocks-in-play/store'
import { runnersSymbolSet } from '@/lib/trading/stocks-in-play/runners/store'
import { resolveInPlayShadowMarks } from '@/lib/trading/stocks-in-play/shadow-journal'
import { resolveRunnerShadowMarks } from '@/lib/trading/stocks-in-play/runners/shadow-journal'
import { publishInvestmentEvent } from '@/lib/notifications/investment-events'
import { expireStalePendingApprovals } from '@/lib/investment/order-approval-service'
import { ensureIbkrBrokerConnected } from '@/lib/trading/ibkr-reconnect'
import {
  fetchLiveLimitPrice,
  fetchTradingAccountSnapshot,
  fetchTradingOpenSymbols,
  fetchTradingPosition,
  fetchPremarketUsPrice,
  fetchTradingPrice,
} from '@/lib/trading/ibkr-data'
import { midFromBidAsk } from '@/lib/trading/limit-price'
import { getInvestmentRuntimeFlags, isIbkrCryptoEnabled } from '@/lib/investment/runtime-flags'
import {
  IbkrOrderRejectedError,
  IbkrSubmitTimeoutError,
  submitSupervisedLiveLimitOrder,
} from '@/lib/investment/ibkr-supervised-submit'
import { US_QUOTE_EXCHANGES } from '@/lib/trading/ticker-price-routes'
import {
  getUsMarketSession,
  selectTickersForOpenMarkets,
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
  getDailyUniverse,
} from '@/lib/investment/market-daily-universe'
import {
  isAlpacaTicker,
  isAlpacaCryptoTicker,
  isAlpacaForexTicker,
  toAlpacaCryptoPairId,
  ALPACA_CRYPTO_ORDER_NOTIONAL_USD,
  ALPACA_FOREX_ORDER_UNITS,
  alpacaAssetClass,
} from '@/lib/brokers/alpaca-pairs'
import { getQuote as getEodhdQuote } from '@/lib/market-data/eodhd'
import {
  getPrice as getAlpacaPrice,
  getAccount as getAlpacaAccount,
  getPositions as getAlpacaPositions,
  hasAlpacaPosition,
  isAlpacaConfigured,
  placeOrder as placeAlpacaOrder,
  getRecentBars,
} from '@/lib/brokers/alpaca-client'
import { evaluateAlpacaStrategy } from '@/lib/brokers/alpaca-strategies'
import {
  activateBrokerDayStop,
  getDayOpeningNav,
  getBrokerDayStopReason,
  isBrokerDayStopped,
  isIbkrDrawdownHaltReason,
  type BrokerId,
} from '@/lib/trading/nav-day-open'
import {
  isRebuyCooldownActive,
  MAX_CRYPTO_OPEN_POSITIONS,
} from '@/lib/trading/trailing-registry'
import {
  cryptoIbkrAccountId,
  cryptoLiveMaxNotionalEur,
  cryptoLiveMaxNotionalUsd,
  cryptoLiveMaxPositions,
  getCryptoBroker,
  isKrakenCryptoBroker,
} from '@/lib/trading/crypto/config'
import {
  beginCryptoCycleReservation,
  getCryptoSlotReservation,
} from '@/lib/trading/crypto/slot-reservation'
import {
  getKrakenAdapter,
  isKrakenConfigured,
  isKrakenEurPair,
  normalizeKrakenPair,
  quantizeKrakenVolume,
  getKrakenPairMeta,
} from '@/lib/brokers/kraken'
import { evaluateCryptoIntradayStrategies } from '@/lib/trading/crypto/intraday-strategies'

/** Max tickers per automatic background cycle. */
/** Analyze up to 50 tickers per automatic / typed cycle; explicit cycles are uncapped. */
export const MAX_AUTO_CYCLE_TICKERS = 50;

/** Automatic / typed cycle wall-clock cap. */
export const CYCLE_TIMEOUT_MS = 120 * 1000;

/** Explicit POST cycle wall-clock cap. */
export const EXPLICIT_CYCLE_TIMEOUT_MS = 30 * 1000;

export type CycleKind = "auto" | "explicit" | "stocks" | "crypto" | "forex";

export type RunCycleOptions = {
  explicitTickers?: boolean;
  cycleKind?: CycleKind;
  /** Minimum BUY confidence before enqueue / Telegram (default 0.70 auto, 0.65 typed). */
  minBuyConfidence?: number;
  /** Forex cycle — signal only, no IBKR/Alpaca execution. */
  analysisOnly?: boolean;
};

/** Analyze up to 20 tickers per automatic cycle; explicit cycles are uncapped. */
function maxCycleTickers(explicit = false): number {
  return explicit ? 500 : MAX_AUTO_CYCLE_TICKERS;
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
function prioritizeCycleTickers(tickers: readonly string[], explicit = false): string[] {
  const cap = maxCycleTickers(explicit)
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
    else if (isIbkrCryptoTicker(t) || isAlpacaCryptoTicker(t)) crypto.push(t)
    else if (isAlpacaForexTicker(t)) crypto.push(t)
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
  // Stocks/crypto get prices from EODHD — never block them after an IBKR timeout.
  // Only forex keeps the temporary skip list.
  if (!isAlpacaForexTicker(ticker)) return false
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
    signal: notAnalyzedSignal('timeout IBKR'),
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
  // No fixed $500 ceiling — cash + risk sizing decides affordability
  return { accountId: id, minPrice: 0.75, maxPrice: Number.POSITIVE_INFINITY, deployableUSD, capitalPct }
}

/**
 * Dynamic position sizing — never use >80% cash; max 20% per position
 * (80% allowed on micro accounts < $500 so 1 share remains feasible).
 */
/** Estimated IBKR USD stock commission for affordability checks. */
export function estimateIbkrStockCommissionUsd(qty: number, price: number): number {
  // ~$0.005/share, min $1 — used only for cash-fit checks
  const perShare = Math.max(1, qty) * 0.005
  return Math.max(1, Math.min(perShare, Math.max(0, qty) * price * 0.01))
}

function parseFractionalEnabled(): boolean {
  const v = (process.env.IBKR_FRACTIONAL_ENABLED ?? "false").trim().toLowerCase()
  return v === "1" || v === "true" || v === "yes" || v === "on"
}

export type PositionSizeResult = {
  qty: number
  deployable: number
  /** Cash after 20% reserve (80% of cash). */
  usableCash: number
  limitingRule?: "reserve" | "risk_cap" | "order_cap" | "price" | "stop_nav" | "none"
  reason?: string
  fractional?: boolean
}

/**
 * Size stocks BUY. With low cash: allow 1 share if it fits in 95% of cash
 * (incl. commission) and technical stop loss ≤ 3% of NAV.
 */
export function resolvePositionSize(
  account: { cashUSD: number; availableFunds?: number; navUSD?: number },
  price: number,
  confidence: number,
  opts?: { stopLossPrice?: number | null },
): PositionSizeResult {
  const cash = Math.max(0, account.availableFunds ?? account.cashUSD)
  const nav = Math.max(cash, account.navUSD ?? cash)
  if (!(price > 0) || !(cash > 0)) {
    return {
      qty: 0,
      deployable: 0,
      usableCash: 0,
      limitingRule: "price",
      reason: "sin capital o precio",
    }
  }
  const usableCash = cash * 0.8
  const maxByRisk = cash < 500 ? usableCash : cash * 0.2
  const deployable = Math.min(usableCash, maxByRisk)
  const limitingRule: PositionSizeResult["limitingRule"] =
    deployable === usableCash ? "reserve" : "risk_cap"

  const confidenceMultiplier =
    confidence >= 0.8 ? 1.0 : confidence >= 0.7 ? 0.75 : 0.5
  let qty = Math.floor((deployable * confidenceMultiplier) / price)

  const stop = opts?.stopLossPrice
  const stopOkForQty = (shareQty: number): boolean => {
    if (!(stop != null && stop > 0 && stop < price && nav > 0)) return true
    const lossUsd = (price - stop) * Math.max(shareQty, 0)
    return lossUsd / nav <= 0.03
  }

  const fractionalEnabled = parseFractionalEnabled()
  if (fractionalEnabled && cash * 0.95 >= 25) {
    const cash95 = cash * 0.95
    const fracNotional = Math.min(
      cash95 - 1,
      deployable > 0 ? deployable * confidenceMultiplier : cash95,
    )
    if (fracNotional >= 25 && stopOkForQty(fracNotional / price)) {
      const fracQty = Math.round((fracNotional / price) * 1e6) / 1e6
      if (fracQty > 0) {
        return {
          qty: fracQty,
          deployable: fracNotional,
          usableCash,
          limitingRule: "none",
          reason: `fracción IBKR ~$${fracNotional.toFixed(2)} (cash $${cash.toFixed(2)}, IBKR_FRACTIONAL_ENABLED)`,
          fractional: true,
        }
      }
    }
  }

  if (qty === 0) {
    const commission = estimateIbkrStockCommissionUsd(1, price)
    const cash95 = cash * 0.95
    if (1 * price + commission <= cash95 && stopOkForQty(1)) {
      return {
        qty: 1,
        deployable: price + commission,
        usableCash,
        limitingRule: "none",
        reason: "1 acción (fallback cash≥95% y stop≤3% NAV)",
      }
    }
    if (fractionalEnabled && cash95 >= 25) {
      const fracNotional = Math.min(cash95 - 1, deployable > 0 ? deployable : cash95)
      if (fracNotional >= 25) {
        const fracQty = fracNotional / price
        if (fracQty > 0 && stopOkForQty(fracQty)) {
          return {
            qty: Math.round(fracQty * 1e6) / 1e6,
            deployable: fracNotional,
            usableCash,
            limitingRule: "none",
            reason: `fracción IBKR ~$${fracNotional.toFixed(2)} (cash $${cash.toFixed(2)}, IBKR_FRACTIONAL_ENABLED)`,
            fractional: true,
          }
        }
      }
    }
    const need = price + estimateIbkrStockCommissionUsd(1, price)
    let rule = limitingRule
    let detail = `utilizable $${usableCash.toFixed(2)} (reserva 20%); deployable $${deployable.toFixed(2)}`
    if (!stopOkForQty(1)) {
      rule = "stop_nav"
      detail += `; stop 1 acción > 3% NAV`
    } else if (need > cash * 0.95) {
      rule = "price"
      detail += `; 1 acción+fee $${need.toFixed(2)} > 95% cash $${(cash * 0.95).toFixed(2)}`
    } else {
      detail += `; precio $${price.toFixed(2)} > deployable`
    }
    return {
      qty: 0,
      deployable,
      usableCash,
      limitingRule: rule,
      reason: detail,
    }
  }

  qty = Math.max(1, qty)
  while (qty > 1 && qty * price > usableCash) qty -= 1
  return { qty, deployable, usableCash, limitingRule: "none" }
}

export type OrderSignalSnapshot = {
  confidence: number
  reasoning: string
  urgency: string
  /** false = descartado antes del análisis técnico */
  analyzed?: boolean
  price?: number | null
  ema20?: number | null
  ema50?: number | null
  ema200?: number | null
  rsi14?: number | null
  macd?: { line: number; signal: number; histogram: number } | null
  atr14?: number | null
  relativeVolume?: number | null
  support?: number | null
  resistance?: number | null
  componentScores?: Record<string, number> | null
  scoreTotal?: number | null
  entry?: number | null
  stop?: number | null
  target?: number | null
}

export type OrderResult = {
  orderId?: string
  approvalId?: string
  status:
    | 'EXECUTED'
    | 'PENDING_APPROVAL'
    | 'REJECTED_RISK'
    | 'REJECTED_CONFIDENCE'
    | 'SIGNAL_NO_CAPITAL'
    | 'HOLD'
    | 'SKIPPED'
    | 'ERROR'
  ticker: string
  direction: 'BUY' | 'SELL' | 'HOLD'
  sharesOrValue?: number
  price?: number
  /** Strategy / agent combo that produced the signal (e.g. "momentum+news"). */
  agents?: string
  reason: string
  signal: OrderSignalSnapshot
  timestamp: string
  stopLoss?: number
  takeProfit?: number
}

/** Pre-analysis discard — never show as bare "0% confidence". */
function notAnalyzedSignal(motivo: string): OrderSignalSnapshot {
  return {
    confidence: 0,
    reasoning: `no analizado: ${motivo}`,
    urgency: 'LOW',
    analyzed: false,
  }
}

function analyzedSignalFromStrategy(
  strategy: {
    confidence: number
    reasoning: string
    urgency: string
    stopLoss: number
    takeProfit: number
    rsi: number | null
    metrics: {
      ema20?: number | null
      ema50?: number | null
      ema200?: number | null
      macdLine?: number | null
      macdSignal?: number | null
      macdHist?: number | null
      atr14?: number | null
      relVolume?: number
      support?: number | null
      resistance?: number | null
      componentScores?: Record<string, number> | null
      scoreTotal?: number | null
    }
  },
  price: number,
): OrderSignalSnapshot {
  const m = strategy.metrics
  const macd =
    m.macdLine != null && m.macdSignal != null && m.macdHist != null
      ? { line: m.macdLine, signal: m.macdSignal, histogram: m.macdHist }
      : null
  return {
    confidence: strategy.confidence,
    reasoning: strategy.reasoning,
    urgency: strategy.urgency,
    analyzed: true,
    price,
    ema20: m.ema20 ?? null,
    ema50: m.ema50 ?? null,
    ema200: m.ema200 ?? null,
    rsi14: strategy.rsi,
    macd,
    atr14: m.atr14 ?? null,
    relativeVolume: m.relVolume ?? null,
    support: m.support ?? null,
    resistance: m.resistance ?? null,
    componentScores: m.componentScores ?? null,
    scoreTotal: m.scoreTotal ?? (strategy.confidence > 0 ? Math.round(strategy.confidence * 100) : null),
    entry: price,
    stop: strategy.stopLoss > 0 ? strategy.stopLoss : null,
    target: strategy.takeProfit > 0 ? strategy.takeProfit : null,
  }
}

const NO_CAPITAL_TELEGRAM_TTL_MS = 4 * 60 * 60 * 1000
const noCapitalTelegramAt = new Map<string, number>()

/** BUY signal kept for visibility — no order when cash cannot buy 1 share. */
async function emitSignalNoCapital(params: {
  ticker: string
  confidence: number
  price: number
  available: number
  usableCash?: number
  limitingRule?: string
  detail?: string
  agents?: string
  reasoning: string
  urgency: string
  currency?: 'USD' | 'EUR'
  accountId?: string | null
}): Promise<OrderResult> {
  const ticker = params.ticker.toUpperCase()
  const ccy = params.currency ?? 'USD'
  const sym = ccy === 'EUR' ? '€' : '$'
  const usable = params.usableCash ?? params.available * 0.8
  const rule = params.limitingRule ?? "reserve"
  const acct = params.accountId ? `cuenta ${params.accountId} ` : ''
  const detail =
    params.detail ??
    `utilizable ${sym}${usable.toFixed(2)}; regla=${rule}`
  const now = Date.now()
  const last = noCapitalTelegramAt.get(ticker) ?? 0
  if (now - last >= NO_CAPITAL_TELEGRAM_TTL_MS) {
    noCapitalTelegramAt.set(ticker, now)
    const conf = Math.round(params.confidence * 100)
    const flag = ccy === 'EUR' ? '🇪🇺' : '🇺🇸'
    const line =
      `💡 OPORTUNIDAD ${flag} ${ticker} BUY ${conf}% @ ${sym}${params.price.toFixed(2)} ` +
      `— sin capital (${acct}${detail})`
    void sendTelegramMessage(line).catch((err) => {
      console.warn(
        `[Telegram] SIGNAL_NO_CAPITAL ${ticker}:`,
        err instanceof Error ? err.message : err,
      )
    })
  }
  console.log(
    `[Signal] ${ticker}: SIGNAL_NO_CAPITAL conf=${(params.confidence * 100).toFixed(0)}% ` +
      `price=${sym}${params.price.toFixed(2)} ${acct}${detail}`,
  )
  return {
    status: 'SIGNAL_NO_CAPITAL',
    ticker,
    direction: 'BUY',
    price: params.price,
    agents: params.agents,
    reason:
      `sin capital — ${acct}${ccy} cash ${sym}${params.available.toFixed(2)}; ${detail}`,
    signal: {
      confidence: params.confidence,
      reasoning: params.reasoning,
      urgency: params.urgency,
    },
    timestamp: new Date().toISOString(),
  }
}

function isCapitalAffordabilityReject(reason: string): boolean {
  return /capital insuficiente|precio \$[\d.]+ > (presupuesto|capital)|sin capital/i.test(reason)
}

export type TradeCycleResult = {
  cycleId: string
  startedAt: string
  completedAt: string
  accountSnapshot: { navUSD: number; cashUSD: number; dailyPnlUSD: number }
  orders: OrderResult[]
  systemHalted: boolean
  haltReason?: string
  /** Soft-skip reason (e.g. ibkr_unavailable) — HTTP 200 to callers. */
  reason?: string
}

/** Minimum confidence for automatic-cycle BUY → PENDING_APPROVAL / Telegram. */
const AUTO_CYCLE_MIN_BUY_CONFIDENCE = 0.7

/** USA regular session minimum (pro-strategies + gate). */
const USA_REGULAR_MIN_CONFIDENCE = 0.6

function minConfidenceForPhase(phase: string): number {
  if (
    phase === 'USA_REGULAR' ||
    phase === 'USA_OPEN' ||
    phase === 'EUROPA' ||
    phase === 'EUROPE' ||
    phase === 'EUROPE_OPEN' ||
    phase === 'ASIA'
  ) {
    return USA_REGULAR_MIN_CONFIDENCE
  }
  if (phase === 'USA_PREMARKET' || phase === 'PRE_MARKET') return 0.62
  if (phase === 'USA_AFTERHOURS') {
    return TRADING_CONFIG.ai.minConfidenceExtendedHours ?? 0.75
  }
  return 0.6
}

export class TradingEngine {
  private risk = RiskManager.getInstance()
  private approvals = OrderApprovalGate.getInstance()

  /** Per-ticker analysis cap — skip silently after 15s. */
  private static readonly TICKER_TIMEOUT_MS = 15_000
  /** Once live submit started, allow longer for IBKR ack. */
  private static readonly AUTO_EXECUTE_TIMEOUT_MS = 60_000
  private static readonly CYCLE_CONCURRENCY = 5
  /** Auto-execute without Telegram when notional ≤ this and conf ≥ threshold. */
  private static readonly INSTANT_EXEC_MAX_NOTIONAL_USD = 250
  private static readonly MANUAL_APPROVAL_CONFIDENCE = 0.65

  private static cycleLock = { running: false, startedAt: 0, cycleId: "" as string };
  private static explicitCycleLock = { running: false, startedAt: 0, cycleId: "" as string };
  private static stocksCycleLock = { running: false, startedAt: 0, cycleId: "" as string };
  private static cryptoCycleLock = { running: false, startedAt: 0, cycleId: "" as string };
  private static forexCycleLock = { running: false, startedAt: 0, cycleId: "" as string };

  static resolveCycleKind(options?: RunCycleOptions): CycleKind {
    if (options?.cycleKind) return options.cycleKind;
    if (options?.explicitTickers) return "explicit";
    return "auto";
  }

  private static lockFor(kind: CycleKind) {
    switch (kind) {
      case "explicit":
        return TradingEngine.explicitCycleLock;
      case "stocks":
        return TradingEngine.stocksCycleLock;
      case "crypto":
        return TradingEngine.cryptoCycleLock;
      case "forex":
        return TradingEngine.forexCycleLock;
      default:
        return TradingEngine.cycleLock;
    }
  }

  private static timeoutFor(kind: CycleKind) {
    if (kind === "explicit") return EXPLICIT_CYCLE_TIMEOUT_MS;
    return CYCLE_TIMEOUT_MS;
  }

  /** Telegram when a broker day STOP activates (opening NAV, current NAV, real %). */
  private static async notifyBrokerDayStopTelegram(args: {
    broker: BrokerId
    openingNav: number
    currentNav: number
    dailyPnlPct: number
  }): Promise<void> {
    try {
      const { sendCriticalTelegramAlert } = await import("@/lib/notifications/telegram-policy")
      const label =
        args.broker === "ibkr"
          ? isIbkrCryptoEnabled()
            ? "IBKR (stocks/crypto)"
            : "IBKR (stocks)"
          : args.broker === "kraken"
            ? "Kraken (crypto EUR)"
            : "Alpaca (crypto)"
      const text = [
        `🛑 RISK STOP ${label}`,
        `Drawdown día: ${args.dailyPnlPct.toFixed(1)}% (> 5%)`,
        `NAV apertura: $${args.openingNav.toFixed(2)}`,
        `NAV actual: $${args.currentNav.toFixed(2)}`,
        `Δ: $${(args.currentNav - args.openingNav).toFixed(2)}`,
        `Solo este broker queda detenido hoy — el otro ciclo sigue activo.`,
      ].join("\n")
      await sendCriticalTelegramAlert(text)
    } catch (err) {
      console.warn(
        "[Risk/DayStop] Telegram failed:",
        err instanceof Error ? err.message : err,
      )
    }
  }

  /** Acquire cycle mutex — each CycleKind has an independent lock. */
  static tryAcquireCycleKind(kind: CycleKind): boolean {
    const lock = TradingEngine.lockFor(kind);
    const timeoutMs = TradingEngine.timeoutFor(kind);
    const now = Date.now();
    if (lock.running && now - lock.startedAt > timeoutMs) {
      console.warn(
        `[TradingCycle] ${kind} bloqueado >${timeoutMs / 1000}s — liberando ${lock.cycleId || "unknown"}`,
      );
      TradingEngine.releaseCycleKind(kind);
    }
    if (lock.running) return false;
    lock.running = true;
    lock.startedAt = now;
    lock.cycleId = "";
    return true;
  }

  static releaseCycleKind(kind: CycleKind): void {
    const lock = TradingEngine.lockFor(kind);
    lock.running = false;
    lock.startedAt = 0;
    lock.cycleId = "";
  }

  /** @deprecated use tryAcquireCycleKind */
  static tryAcquireCycle(explicit = false): boolean {
    return TradingEngine.tryAcquireCycleKind(explicit ? "explicit" : "auto");
  }

  /** @deprecated use releaseCycleKind */
  static releaseCycle(explicit = false): void {
    TradingEngine.releaseCycleKind(explicit ? "explicit" : "auto");
  }

  static isCycleRunning(): boolean {
    return (
      TradingEngine.cycleLock.running ||
      TradingEngine.explicitCycleLock.running ||
      TradingEngine.stocksCycleLock.running ||
      TradingEngine.cryptoCycleLock.running ||
      TradingEngine.forexCycleLock.running
    );
  }

  static isAutoCycleRunning(): boolean {
    return TradingEngine.cycleLock.running;
  }

  static isExplicitCycleRunning(): boolean {
    return TradingEngine.explicitCycleLock.running;
  }

  static isStocksCycleRunning(): boolean {
    return TradingEngine.stocksCycleLock.running;
  }

  static isCryptoCycleRunning(): boolean {
    return TradingEngine.cryptoCycleLock.running;
  }

  static isForexCycleRunning(): boolean {
    return TradingEngine.forexCycleLock.running;
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
   * Ejecuta un ciclo de trading completo para una lista de tickers.
   * Llamado por el API route de Next.js cada X minutos.
   * Ã“rdenes vÃ¡lidas quedan en PENDING_APPROVAL (no se ejecutan automÃ¡ticamente).
   */
  async runCycle(
    tickers: string[],
    options?: RunCycleOptions,
  ): Promise<TradeCycleResult> {
    const kind = TradingEngine.resolveCycleKind(options)
    if (!TradingEngine.tryAcquireCycleKind(kind)) {
      throw new Error(`${kind} cycle already running`)
    }

    const cycleId = `${kind}_${Date.now()}`
    const lock = TradingEngine.lockFor(kind)
    lock.cycleId = cycleId
    const startedAt = new Date().toISOString()
    const timeoutMs = TradingEngine.timeoutFor(kind)

    try {
      return await Promise.race([
        this.runCycleBody(tickers, cycleId, startedAt, options),
        new Promise<TradeCycleResult>((_, reject) => {
          setTimeout(
            () => reject(new Error(`Ciclo timeout ${timeoutMs}ms`)),
            timeoutMs,
          )
        }),
      ])
    } finally {
      TradingEngine.releaseCycleKind(kind)
    }
  }

  private async runCycleBody(
    tickers: string[],
    cycleId: string,
    startedAt: string,
    options?: RunCycleOptions,
  ): Promise<TradeCycleResult> {
    const orders: OrderResult[] = []
    const kind = TradingEngine.resolveCycleKind(options)

    await expireStalePendingApprovals()

    // Cancel stuck IBKR orders only for stocks / auto / explicit — never for crypto/forex
    if (kind !== "crypto" && kind !== "forex") {
      try {
        const stale = await cancelStaleIbkrOrders(300)
        if (stale.count > 0) {
          console.log(`[Cycle] Cancelando ${stale.count} órdenes PreSubmitted/Submitted antiguas...`)
          await new Promise((r) => setTimeout(r, 2000))
        }
      } catch (err) {
        console.warn('[Cycle] cancel stale failed:', err instanceof Error ? err.message : err)
      }
    }

    // 1. Account snapshot — source depends on cycle kind
    let account: {
      navUSD: number
      cashUSD: number
      dailyPnlUSD: number
      openPositionsCount: number
      primaryAccountId?: string | null
    }
    try {
      account = await this.fetchAccountSnapshotForKind(kind)
    } catch (err) {
      if (kind === "stocks" || kind === "auto") {
        const msg = err instanceof Error ? err.message : "ibkr_unavailable"
        console.warn(`[Cycle/${kind}] IBKR account unavailable: ${msg}`)
        return {
          cycleId,
          startedAt,
          completedAt: new Date().toISOString(),
          accountSnapshot: { navUSD: 0, cashUSD: 0, dailyPnlUSD: 0 },
          orders: [],
          systemHalted: false,
          reason: "ibkr_unavailable",
        }
      }
      throw err
    }

    // 2. Per-broker halt — IBKR STOP must not block Alpaca/Kraken crypto; Alpaca STOP must not block stocks
    if (kind === "crypto") {
      const broker = getCryptoBroker()
      const cryptoBroker: BrokerId =
        broker === "kraken"
          ? "kraken"
          : broker === "ibkr" || isIbkrCryptoEnabled()
            ? "ibkr"
            : "alpaca"
      if (isBrokerDayStopped(cryptoBroker)) {
        return {
          cycleId, startedAt, completedAt: new Date().toISOString(),
          accountSnapshot: account, orders: [],
          systemHalted: true, haltReason: getBrokerDayStopReason(cryptoBroker),
        }
      }
      if (
        cryptoBroker === "alpaca" &&
        this.risk.isHalted() &&
        !isIbkrDrawdownHaltReason(this.risk.getHaltReason())
      ) {
        return {
          cycleId, startedAt, completedAt: new Date().toISOString(),
          accountSnapshot: account, orders: [],
          systemHalted: true, haltReason: this.risk.getHaltReason(),
        }
      }
    } else if (kind !== "forex") {
      // Clear stale false STOP from UnrealizedPnL-based dailyPnl (pre-fix)
      if (this.risk.isHalted() && isIbkrDrawdownHaltReason(this.risk.getHaltReason())) {
        const realDdPct =
          account.navUSD > 0 && Number.isFinite(account.dailyPnlUSD)
            ? (account.dailyPnlUSD / account.navUSD) * 100
            : 0
        if (realDdPct > -5) {
          console.log(
            `[Cycle/${kind}] clearing stale IBKR drawdown halt (real DD ${realDdPct.toFixed(1)}%)`,
          )
          this.risk.resume()
        }
      }
      if (isBrokerDayStopped("ibkr")) {
        return {
          cycleId, startedAt, completedAt: new Date().toISOString(),
          accountSnapshot: account, orders: [],
          systemHalted: true, haltReason: getBrokerDayStopReason("ibkr"),
        }
      }
      if (this.risk.isHalted()) {
        return {
          cycleId, startedAt, completedAt: new Date().toISOString(),
          accountSnapshot: account, orders,
          systemHalted: true, haltReason: this.risk.getHaltReason(),
        }
      }
    }

    const explicit = kind === "explicit"
    const seedTickers = explicit
      ? [...new Set(tickers.map((t) => t.trim().toUpperCase()).filter(Boolean))]
      : [...new Set(tickers.map((t) => t.trim().toUpperCase()).filter(Boolean))].slice(
          0,
          MAX_AUTO_CYCLE_TICKERS,
        )

    const scopedRaw =
      kind === "crypto" || kind === "forex"
        ? { tickers: seedTickers, mode: kind }
        : kind === "stocks"
          ? { tickers: seedTickers.filter(isUsStockTicker), mode: "combined" as const }
          : selectTickersForOpenMarkets(seedTickers)
    // Stocks: never re-inject crypto/forex/ETFs from session helpers
    const scoped =
      kind === "stocks"
        ? {
            ...scopedRaw,
            tickers: scopedRaw.tickers.filter(isUsStockTicker),
          }
        : scopedRaw
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
    // Stocks: preserve momentum order from universe — do not re-rank with crypto/ETFs
    const cycleTickers =
      kind === "stocks"
        ? scoped.tickers.filter(isUsStockTicker).slice(0, maxCycleTickers(explicit))
        : prioritizeCycleTickers(
            scoped.tickers.length > 0 ? scoped.tickers : seedTickers,
            explicit,
          )
    // STOCKS_EXECUTION_* / global pause — analyze but do not send orders
    let stocksAnalysisOnly = Boolean(options?.analysisOnly)
    if (kind === "stocks") {
      const enabled = isStocksExecutionEnabled()
      const usOn = isStocksExecutionUsEnabled()
      const euOn = isStocksExecutionEuEnabled()
      const pausedUntil = stocksExecutionPausedUntil()
      if (!enabled) {
        stocksAnalysisOnly = true
        console.warn(
          "[Cycle/stocks] STOCKS_EXECUTION_ENABLED=false — análisis sin órdenes",
        )
      } else if (!usOn && !euOn) {
        stocksAnalysisOnly = true
        console.warn(
          "[Cycle/stocks] STOCKS_EXECUTION_US=false y STOCKS_EXECUTION_EU=false — análisis sin órdenes",
        )
      } else {
        if (!usOn) {
          console.warn(
            "[Cycle/stocks] STOCKS_EXECUTION_US=false — US/ADR sin órdenes (EU puede enviar)",
          )
        }
        if (!euOn) {
          console.warn(
            "[Cycle/stocks] STOCKS_EXECUTION_EU=false — EU sin órdenes (US puede enviar)",
          )
        }
      }
      if (pausedUntil) {
        stocksAnalysisOnly = true
        console.warn(
          `[Cycle/stocks] ejecución pausada hasta ${pausedUntil.toISOString()}: ` +
            `${getStocksExecutionPauseReason() ?? "freno global"}`,
        )
      }
      if (isStocksExecutionPremarketEnabled()) {
        console.log(
          `[Cycle/stocks] STOCKS_EXECUTION_PREMARKET=true — ${getPremarketLiveReadiness().detail}`,
        )
      } else if (isUsPremarketSession()) {
        console.log(
          "[Cycle/stocks] STOCKS_EXECUTION_PREMARKET=false — premarket shadow (sin órdenes)",
        )
      }
      // Resolve shadow MTM at open / near close for pending premarket signals only
      void (async () => {
        try {
          const unique = [
            ...new Set([
              ...listPendingPremarketShadowTickers().slice(0, 25),
              ...[...inPlaySymbolSet()].slice(0, 15),
              ...[...runnersSymbolSet()].slice(0, 15),
            ]),
          ]
          if (unique.length === 0) return
          const marks = new Map<string, number>()
          for (const t of unique) {
            try {
              const px = await this.fetchPrice(t)
              if (px.currentPrice > 0) marks.set(t.toUpperCase(), px.currentPrice)
            } catch {
              /* skip */
            }
          }
          const nRunners = resolveRunnerShadowMarks(marks)
          const nInPlay = resolveInPlayShadowMarks(marks)
          if (nRunners > 0 || nInPlay > 0) {
            console.log(`[Dynamic/shadow] resolved runners=${nRunners} in-play=${nInPlay}`)
          }
          const nOpen = resolvePremarketShadowAtOpen(marks)
          const nClose = resolvePremarketShadowAtClose(marks)
          if (nOpen > 0 || nClose > 0) {
            console.log(
              `[Premarket/shadow] resolved open=${nOpen} close=${nClose} · ${getPremarketLiveReadiness().detail}`,
            )
          }
        } catch (err) {
          console.warn(
            "[Premarket/shadow] resolve failed:",
            err instanceof Error ? err.message : err,
          )
        }
      })()
    }
    const cycleOpts: RunCycleOptions = {
      ...options,
      cycleKind: kind,
      explicitTickers: explicit,
      analysisOnly: stocksAnalysisOnly,
    }
    console.log(
      `[ProStrategy] Ciclo ${cycleId}: kind=${kind} session=${scoped.mode} ` +
        `evaluando ${cycleTickers.length}/${scoped.tickers.length} tickers ` +
        `(max=${maxCycleTickers(explicit)}, concurrency=${TradingEngine.CYCLE_CONCURRENCY}, timeout=${TradingEngine.timeoutFor(kind) / 1000}s)` +
        `${stocksAnalysisOnly && kind === "stocks" ? " analysisOnly=true" : ""}`,
    )
    const cycleBodyStartedMs = Date.now()
    const tickerDurationsMs: Array<{ ticker: string; ms: number }> = []
    const jobs: Array<Promise<OrderResult | null>> = []
    const buySignalTickers = new Set<string>()

    // Kraken: analyze all in parallel, then execute buys by confidence with atomic slot/cash reserve
    if (kind === "crypto" && isKrakenCryptoBroker()) {
      let confirmedLive: string[] = []
      try {
        const { getKrakenAdapter } = await import("@/lib/brokers/kraken/adapter")
        const { confirmedLiveOpenPairs } = await import(
          "@/lib/trading/crypto/position-filters"
        )
        const { journalOpenCryptoPairs } = await import(
          "@/lib/trading/crypto/journal-crypto"
        )
        const positions = await getKrakenAdapter()
          .getPositions()
          .catch(() => [])
        confirmedLive = [
          ...confirmedLiveOpenPairs(positions, journalOpenCryptoPairs()),
        ]
      } catch {
        confirmedLive = []
      }
      beginCryptoCycleReservation(account.cashUSD, confirmedLive)
      console.log(
        `[Cycle/crypto] Kraken two-phase: analyze ${cycleTickers.length} pairs → ` +
          `execute by confidence (maxPos=${cryptoLiveMaxPositions()} confirmedLive=${confirmedLive.length} cash=€${account.cashUSD.toFixed(2)})`,
      )

      type BuyCand = {
        pair: string
        confidence: number
        strategyId: string
        reasoning: string
        stopLoss: number
        takeProfit: number
        quote: { mid: number; bid: number; ask: number }
        volume: number
        limitPrice: number
        notionalEur: number
      }
      const buyCandidates: BuyCand[] = []

      let aCursor = 0
      const analyzeWorker = async (): Promise<void> => {
        while (aCursor < cycleTickers.length) {
          const i = aCursor++
          const ticker = cycleTickers[i]!
          const tickerStartedMs = Date.now()
          try {
            const analyzed = await TradingEngine.withTickerTimeout(
              this.analyzeKrakenTicker(ticker, account, cycleOpts),
              ticker,
            )
            if (analyzed.kind === "order") {
              orders.push(analyzed.order)
              if (analyzed.order.direction === "BUY") buySignalTickers.add(ticker)
            } else {
              buyCandidates.push(analyzed.buy)
              buySignalTickers.add(analyzed.buy.pair)
            }
          } catch (err) {
            if (isTimeoutFailure(err)) {
              orders.push(timeoutSkipResult(ticker, err instanceof Error ? err.message : undefined))
            } else {
              const msg = err instanceof Error ? err.message : "Error desconocido"
              console.warn(`[ProStrategy] ${ticker}: error analyze — ${msg}`)
              orders.push({
                status: "ERROR",
                ticker,
                direction: "BUY",
                reason: msg,
                signal: { confidence: 0, reasoning: "Error en ciclo", urgency: "LOW" },
                timestamp: new Date().toISOString(),
              })
            }
          } finally {
            tickerDurationsMs.push({ ticker, ms: Date.now() - tickerStartedMs })
          }
        }
      }
      await Promise.all(
        Array.from(
          { length: Math.min(TradingEngine.CYCLE_CONCURRENCY, Math.max(1, cycleTickers.length)) },
          () => analyzeWorker(),
        ),
      )

      buyCandidates.sort((a, b) => b.confidence - a.confidence)
      if (buyCandidates.length) {
        console.log(
          `[Cycle/crypto] Kraken BUY candidatos por confianza: ` +
            buyCandidates
              .map((c) => `${c.pair}=${(c.confidence * 100).toFixed(0)}%`)
              .join(", "),
        )
      }

      for (const buy of buyCandidates) {
        const execStarted = Date.now()
        try {
          const order = await TradingEngine.withTickerTimeout(
            this.executeKrakenBuy(buy),
            buy.pair,
            TradingEngine.AUTO_EXECUTE_TIMEOUT_MS,
          )
          orders.push(order)
          if (order.status === "EXECUTED") {
            console.log(
              `[Signal] ${buy.pair}: EXECUTED conf=${(buy.confidence * 100).toFixed(0)}%`,
            )
            // Keep account.cashUSD in sync for logging
            account.cashUSD = Math.max(0, account.cashUSD - buy.notionalEur)
          } else if (order.direction === "BUY" || order.reason === "límite de posiciones" || order.reason === "sin saldo EUR") {
            console.log(
              `[Signal] ${buy.pair}: status=${order.status} conf=${(buy.confidence * 100).toFixed(0)}% reason=${order.reason}`,
            )
          }
        } catch (err) {
          await getCryptoSlotReservation().release(buy.pair).catch(() => undefined)
          const msg = err instanceof Error ? err.message : "Kraken execute failed"
          console.error(`[AutoExecute] ${buy.pair} → ERROR: ${msg}`)
          orders.push({
            status: "ERROR",
            ticker: buy.pair,
            direction: "BUY",
            reason: msg,
            signal: { confidence: buy.confidence, reasoning: buy.reasoning, urgency: "HIGH" },
            timestamp: new Date().toISOString(),
          })
        } finally {
          tickerDurationsMs.push({ ticker: buy.pair, ms: Date.now() - execStarted })
        }
      }
    } else {
    let cursor = 0
    const worker = async (): Promise<void> => {
      while (cursor < cycleTickers.length) {
        if (kind === "crypto") {
          const cryptoBroker: BrokerId = isKrakenCryptoBroker()
            ? "kraken"
            : isIbkrCryptoEnabled()
              ? "ibkr"
              : "alpaca"
          if (isBrokerDayStopped(cryptoBroker)) return
          if (
            cryptoBroker === "alpaca" &&
            this.risk.isHalted() &&
            !isIbkrDrawdownHaltReason(this.risk.getHaltReason())
          ) {
            return
          }
        } else if (kind !== "forex") {
          if (isBrokerDayStopped("ibkr") || this.risk.isHalted()) return
        }
        const i = cursor++
        const ticker = cycleTickers[i]!
        jobs[i] = (async () => {
          const tickerStartedMs = Date.now()
          const execGate = { enteredAutoExecute: false, buySignal: false }
          const work = this.processTicker(ticker, account, execGate, cycleOpts)
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
            } else if (order.status === 'SIGNAL_NO_CAPITAL') {
              /* already logged in emitSignalNoCapital */
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
          } finally {
            tickerDurationsMs.push({ ticker, ms: Date.now() - tickerStartedMs })
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
    } // end non-Kraken path

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

    if (kind === "stocks") {
      const fase = getCurrentTradingPhase()
      const analyzedOk = orders.filter((o) => {
        if (
          o.status === "SKIPPED" &&
          /fuera de ciclo|ETF indicador|crypto|forex|non-tradable/i.test(o.reason ?? "")
        ) {
          return false
        }
        return true
      }).length
      const señales = orders.filter(
        (o) =>
          (o.direction === "BUY" &&
            !["SKIPPED", "HOLD", "REJECTED_CONFIDENCE"].includes(o.status)) ||
          o.status === "SIGNAL_NO_CAPITAL",
      ).length
      const buyN = orders.filter((o) => o.direction === "BUY").length
      const enviadas = orders.filter(
        (o) => o.status === "EXECUTED" || o.status === "PENDING_APPROVAL",
      ).length
      const rechazadas = orders.filter(
        (o) =>
          o.status === "ERROR" ||
          (o.status === "REJECTED_RISK" && !isCapitalAffordabilityReject(o.reason ?? "")) ||
          /ORDER_REJECTED|INACTIVE|no EXECUTED|NO NEGOCIABLE/i.test(o.reason ?? ""),
      ).length
      const sinCapital = orders.filter(
        (o) =>
          o.status === "SIGNAL_NO_CAPITAL" ||
          (o.status === "REJECTED_RISK" && isCapitalAffordabilityReject(o.reason ?? "")),
      ).length
      const euSample = ['SAN', 'IBE', 'SAP']
        .map((sym) => {
          const s = getEquityStrategySession(sym)
          return `${sym}:${s.localTime}${s.regularSessionOpen ? '✓' : '✗'}[${s.eligibleStrategyIds.length}]`
        })
        .join(' ')
      console.log(
        `[Cycle/stocks] fase=${fase} analizados=${analyzedOk} señales=${señales} BUY=${buyN} ` +
          `enviadas=${enviadas} sin_capital=${sinCapital} rechazadas=${rechazadas} | euSess ${euSample}`,
      )

      try {
        const { recordStocksCycleSummary } = await import(
          '@/lib/trading/stocks/daily-telegram'
        )
        const discardByReason: Record<string, number> = {}
        for (const o of orders) {
          if (o.signal.analyzed === false) {
            const key = (o.reason || o.signal.reasoning || 'no analizado').slice(0, 72)
            discardByReason[key] = (discardByReason[key] ?? 0) + 1
          } else if (
            o.direction === 'HOLD' ||
            o.status === 'HOLD' ||
            o.status === 'REJECTED_CONFIDENCE'
          ) {
            const key = (o.signal.reasoning || o.reason || 'hold').slice(0, 72)
            discardByReason[key] = (discardByReason[key] ?? 0) + 1
          }
        }
        recordStocksCycleSummary({
          analyzed: analyzedOk,
          signals: señales,
          ordersSent: enviadas,
          ordersFilled: autoEjecutadas,
          accountLabel: isEuropeanEquityOrderWindow() ? 'U15513057' : 'U24225949',
          discardByReason,
        })
      } catch {
        /* optional */
      }

      const cycleElapsedMs = Date.now() - cycleBodyStartedMs
      if (cycleElapsedMs > 100_000) {
        const slowest = [...tickerDurationsMs].sort((a, b) => b.ms - a.ms).slice(0, 5)
        console.log(
          `[Cycle/stocks] lento ${(cycleElapsedMs / 1000).toFixed(1)}s — top5: ` +
            slowest.map((r) => `${r.ticker}=${(r.ms / 1000).toFixed(1)}s`).join(", "),
        )
      }
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

    try {
      const orderId = await this.executeOrder({
        approvalId,
        ticker: approved.ticker,
        direction: approved.direction,
        shares: approved.shares,
        fractional: approved.fractional,
        cashQtyUsd: approved.cashQtyUsd,
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
            try {
              this.approvals.markError(
                approvalId,
                `IBKR no Filled: ${fill.outcome}/${fill.status}`,
              )
            } catch {
              /* ignore */
            }
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
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      try {
        this.approvals.markError(approvalId, msg)
      } catch {
        /* ignore */
      }
      console.error(`[AutoExecute] ${approved.ticker} → ERROR tras APPROVED: ${msg} ❌`)
      return {
        approvalId,
        status: 'ERROR',
        ticker: approved.ticker,
        direction: approved.direction,
        sharesOrValue: approved.orderValueUSD,
        price: approved.price,
        reason: `Execute failed after APPROVED: ${msg}`,
        signal: approved.signal,
        timestamp: new Date().toISOString(),
        stopLoss: approved.stopLoss,
        takeProfit: approved.takeProfit,
      }
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

  private async analyzeKrakenTicker(
    ticker: string,
    account: {
      navUSD: number
      cashUSD: number
      dailyPnlUSD: number
      openPositionsCount: number
      primaryAccountId?: string | null
    },
    cycleOpts?: RunCycleOptions,
  ): Promise<
    | { kind: "order"; order: OrderResult }
    | {
        kind: "buy"
        buy: {
          pair: string
          confidence: number
          strategyId: string
          reasoning: string
          stopLoss: number
          takeProfit: number
          quote: { mid: number; bid: number; ask: number }
          volume: number
          limitPrice: number
          notionalEur: number
        }
      }
  > {
    const pair = normalizeKrakenPair(ticker)
    if (!pair) {
      return {
        kind: "order",
        order: {
          status: 'HOLD',
          ticker,
          direction: 'HOLD',
          reason: `${ticker}: no es par Kraken EUR`,
          signal: { confidence: 0, reasoning: 'Unknown Kraken pair', urgency: 'LOW' },
          timestamp: new Date().toISOString(),
        },
      }
    }

    if (!isKrakenConfigured()) {
      return {
        kind: "order",
        order: {
          status: 'HOLD',
          ticker: pair,
          direction: 'HOLD',
          reason: 'Kraken no configurado (KRAKEN_API_KEY / KRAKEN_API_SECRET)',
          signal: { confidence: 0, reasoning: 'Kraken keys missing', urgency: 'LOW' },
          timestamp: new Date().toISOString(),
        },
      }
    }

    const adapter = getKrakenAdapter()
    await adapter.warmPairMeta().catch(() => undefined)

    console.log(`[AutoExecute] ${pair} → precio Kraken…`)
    let quote: { mid: number; bid: number; ask: number }
    try {
      const q = await adapter.getQuote(pair)
      quote = { mid: q.mid, bid: q.bid, ask: q.ask }
      console.log(`[AutoExecute] ${pair} → Kraken €${quote.mid.toFixed(4)}`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'precio no disponible'
      return {
        kind: "order",
        order: {
          status: 'SKIPPED',
          ticker: pair,
          direction: 'HOLD',
          reason: msg,
          signal: { confidence: 0, reasoning: 'Sin precio Kraken', urgency: 'LOW' },
          timestamp: new Date().toISOString(),
        },
      }
    }

    const positions = await adapter.getPositions().catch(() => [])
    if (positions.some((p) => p.symbol === pair && p.qty > 0)) {
      return {
        kind: "order",
        order: {
          status: 'HOLD',
          ticker: pair,
          direction: 'HOLD',
          reason: `${pair}: posición Kraken ya abierta`,
          signal: { confidence: 0, reasoning: 'Kraken position exists', urgency: 'LOW' },
          timestamp: new Date().toISOString(),
        },
      }
    }

    if (isRebuyCooldownActive(pair)) {
      return {
        kind: "order",
        order: {
          status: 'HOLD',
          ticker: pair,
          direction: 'HOLD',
          reason: `${pair}: cooldown 6h post-venta`,
          signal: { confidence: 0, reasoning: 'Rebuy cooldown 6h', urgency: 'LOW' },
          timestamp: new Date().toISOString(),
        },
      }
    }

    const bars15 = await adapter.getBars(pair, 15, 96).catch(() => [])
    const bars1h = await adapter.getBars(pair, 60, 80).catch(() => [])
    const ohlcv15 = bars15.map((b) => ({
      open: b.open,
      high: b.high,
      low: b.low,
      close: b.close,
      volume: b.volume,
      date: b.time,
    }))
    const ohlcv1h = bars1h.map((b) => ({
      open: b.open,
      high: b.high,
      low: b.low,
      close: b.close,
      volume: b.volume,
      date: b.time,
    }))
    const intra = evaluateCryptoIntradayStrategies(pair, ohlcv15, ohlcv1h)

    if (intra.direction === 'HOLD' || !intra.strategyId) {
      return {
        kind: "order",
        order: {
          status: 'HOLD',
          ticker: pair,
          direction: 'HOLD',
          reason: intra.reasoning,
          signal: { confidence: intra.confidence, reasoning: intra.reasoning, urgency: 'LOW' },
          timestamp: new Date().toISOString(),
          stopLoss: intra.stopLoss,
          takeProfit: intra.takeProfit,
        },
      }
    }

    const minConf = cycleOpts?.minBuyConfidence ?? 0.5
    if (intra.confidence < minConf) {
      return {
        kind: "order",
        order: {
          status: 'REJECTED_CONFIDENCE',
          ticker: pair,
          direction: 'BUY',
          reason: `Confianza ${(intra.confidence * 100).toFixed(0)}% < mínimo ${(minConf * 100).toFixed(0)}%`,
          signal: { confidence: intra.confidence, reasoning: intra.reasoning, urgency: 'MEDIUM' },
          timestamp: new Date().toISOString(),
        },
      }
    }

    const maxNotional = cryptoLiveMaxNotionalEur()
    const cashEur = Math.max(0, account.cashUSD)
    const notional = Math.min(maxNotional, cashEur > 0 ? cashEur : maxNotional)
    if (!(notional > 0) || !(quote.mid > 0)) {
      return {
        kind: "order",
        order: {
          status: 'HOLD',
          ticker: pair,
          direction: 'HOLD',
          reason: 'sin saldo EUR',
          signal: { confidence: intra.confidence, reasoning: intra.reasoning, urgency: 'LOW' },
          timestamp: new Date().toISOString(),
        },
      }
    }

    let rawQty = notional / quote.mid
    const meta = await getKrakenPairMeta(pair)
    if (meta) {
      rawQty = quantizeKrakenVolume(rawQty, meta)
      if (!(rawQty > 0)) {
        return {
          kind: "order",
          order: {
            status: 'HOLD',
            ticker: pair,
            direction: 'HOLD',
            reason: `qty bajo mínimo Kraken (ordermin=${meta.orderMin})`,
            signal: { confidence: intra.confidence, reasoning: intra.reasoning, urgency: 'LOW' },
            timestamp: new Date().toISOString(),
          },
        }
      }
    }

    const limitPrice = quote.ask > 0 ? quote.ask : quote.mid * 1.001
    const notionalEur = rawQty * limitPrice

    return {
      kind: "buy",
      buy: {
        pair,
        confidence: intra.confidence,
        strategyId: intra.strategyId,
        reasoning: intra.reasoning,
        stopLoss: intra.stopLoss,
        takeProfit: intra.takeProfit,
        quote,
        volume: rawQty,
        limitPrice,
        notionalEur,
      },
    }
  }

  /** Atomic slot+cash reserve then place Kraken limit buy. */
  private async executeKrakenBuy(buy: {
    pair: string
    confidence: number
    strategyId: string
    reasoning: string
    stopLoss: number
    takeProfit: number
    quote: { mid: number; bid: number; ask: number }
    volume: number
    limitPrice: number
    notionalEur: number
  }): Promise<OrderResult> {
    const { pair } = buy
    const reservation = getCryptoSlotReservation()
    const reserved = await reservation.tryReserve({
      symbol: pair,
      notionalEur: buy.notionalEur,
      maxPositions: cryptoLiveMaxPositions(),
    })

    if (!reserved.ok) {
      const reason =
        reserved.reason === "positions" ? "límite de posiciones" : "sin saldo EUR"
      console.log(
        `[AutoExecute] ${pair} → HOLD ${reason} (${reserved.message})`,
      )
      return {
        status: 'HOLD',
        ticker: pair,
        direction: 'HOLD',
        reason,
        signal: { confidence: buy.confidence, reasoning: buy.reasoning, urgency: 'LOW' },
        timestamp: new Date().toISOString(),
        stopLoss: buy.stopLoss,
        takeProfit: buy.takeProfit,
      }
    }

    recordSignalForTelegram({
      ticker: pair,
      direction: 'BUY',
      confidence: buy.confidence,
      at: new Date().toISOString(),
    })

    try {
      const adapter = getKrakenAdapter()
      const submitted = await adapter.placeOrder({
        symbol: pair,
        side: 'buy',
        volume: buy.volume,
        price: buy.limitPrice,
      })

      await reservation.commit(pair)

      console.log(
        `[AutoExecute] ${pair} → ₿ KRAKEN BUY qty=${submitted.volume} @€${submitted.price} id=${submitted.orderId}`,
      )

      const { appendJournalTrade } = await import('@/lib/trading/journal/trades')
      appendJournalTrade({
        at: new Date().toISOString(),
        market: 'crypto',
        strategy: buy.strategyId,
        ticker: pair,
        side: 'BUY',
        entry: submitted.price,
        exit: null,
        exitReason: null,
        grossPnlUsd: null,
        costsUsd: 0,
        netPnlUsd: null,
        rMultiple: null,
        durationMs: null,
        shadow: false,
        open: true,
      })

      const { registerCryptoExitPosition } = await import(
        '@/lib/trading/exit-manager'
      )
      registerCryptoExitPosition({
        symbol: pair,
        entryPrice: submitted.price,
        stopLoss: buy.stopLoss,
        takeProfit: buy.takeProfit,
        qty: submitted.volume,
        strategy: buy.strategyId,
        orderId: submitted.orderId,
      })

      const buyLine =
        `🟢 BUY ₿ KRAKEN ${pair} ${submitted.volume} @ €${submitted.price.toFixed(4)} | ` +
        `${buy.strategyId} conf=${(buy.confidence * 100).toFixed(0)}% SL €${buy.stopLoss.toFixed(4)} TP €${buy.takeProfit.toFixed(4)}`
      console.log(`[AutoExecute] ${buyLine}`)
      void sendTelegramMessage(buyLine, undefined, { kind: 'trade', platform: 'KRAKEN' }).catch(() => undefined)

      return {
        status: 'EXECUTED',
        orderId: submitted.orderId,
        ticker: pair,
        direction: 'BUY',
        sharesOrValue: submitted.volume,
        price: submitted.price,
        agents: buy.strategyId,
        reason: `₿ KRAKEN ${buy.strategyId}: ${buy.reasoning}`,
        signal: {
          confidence: buy.confidence,
          reasoning: buy.reasoning,
          urgency: 'HIGH',
        },
        timestamp: new Date().toISOString(),
        stopLoss: buy.stopLoss,
        takeProfit: buy.takeProfit,
      }
    } catch (err) {
      await reservation.release(pair)
      const msg = err instanceof Error ? err.message : 'Kraken order failed'
      const insufficient =
        /insufficient funds|EOrder:Insufficient|insufficient/i.test(msg)
      console.error(`[AutoExecute] ${pair} → ${insufficient ? 'HOLD' : 'ERROR'} Kraken: ${msg}`)
      return {
        status: insufficient ? 'HOLD' : 'ERROR',
        ticker: pair,
        direction: insufficient ? 'HOLD' : 'BUY',
        reason: insufficient ? 'sin saldo EUR' : msg,
        signal: { confidence: buy.confidence, reasoning: buy.reasoning, urgency: 'HIGH' },
        timestamp: new Date().toISOString(),
      }
    }
  }

  private async processKrakenTicker(
    ticker: string,
    account: {
      navUSD: number
      cashUSD: number
      dailyPnlUSD: number
      openPositionsCount: number
      primaryAccountId?: string | null
    },
    execGate?: { enteredAutoExecute: boolean; buySignal: boolean },
    cycleOpts?: RunCycleOptions,
  ): Promise<OrderResult> {
    const analyzed = await this.analyzeKrakenTicker(ticker, account, cycleOpts)
    if (analyzed.kind === "order") return analyzed.order
    if (execGate) {
      execGate.buySignal = true
      execGate.enteredAutoExecute = true
    }
    return this.executeKrakenBuy(analyzed.buy)
  }

  private async processAlpacaTicker(
    ticker: string,
    account: {
      navUSD: number
      cashUSD: number
      dailyPnlUSD: number
      openPositionsCount: number
      primaryAccountId?: string | null
    },
    execGate?: { enteredAutoExecute: boolean; buySignal: boolean },
    cycleOpts?: RunCycleOptions,
  ): Promise<OrderResult> {
    const asset = alpacaAssetClass(ticker)
    if (!asset) {
      return {
        status: 'HOLD',
        ticker,
        direction: 'HOLD',
        reason: `${ticker}: no es par Alpaca`,
        signal: { confidence: 0, reasoning: 'Unknown Alpaca ticker', urgency: 'LOW' },
        timestamp: new Date().toISOString(),
      }
    }

    if (!isAlpacaConfigured()) {
      return {
        status: 'HOLD',
        ticker,
        direction: 'HOLD',
        reason: 'Alpaca paper no configurado (ALPACA_API_KEY / ALPACA_SECRET)',
        signal: { confidence: 0, reasoning: 'Alpaca keys missing', urgency: 'LOW' },
        timestamp: new Date().toISOString(),
      }
    }

    console.log(`[AutoExecute] ${ticker} → precio ${asset === 'forex' ? 'EODHD' : 'Alpaca'} (${asset})…`)
    let quote: { price: number; source: string }
    try {
      if (asset === 'forex') {
        const eod = await getEodhdQuote(ticker)
        if (!eod || !(eod.price > 0)) {
          throw new Error('precio EODHD forex no disponible')
        }
        quote = { price: eod.price, source: eod.source }
        console.log(
          `[AutoExecute] ${ticker} → EODHD $${quote.price.toFixed(5)} (${quote.source})`,
        )
      } else {
        const alpaca = await getAlpacaPrice(ticker)
        quote = { price: alpaca.price, source: alpaca.source }
        console.log(
          `[AutoExecute] ${ticker} → Alpaca $${quote.price.toFixed(2)} (${quote.source})`,
        )
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'precio no disponible'
      console.log(`[AutoExecute] ${ticker} → skip: ${msg}`)
      return {
        status: 'SKIPPED',
        ticker,
        direction: 'HOLD',
        reason: asset === 'forex' ? `${ticker}: sin precio forex EODHD` : msg,
        signal: { confidence: 0, reasoning: 'Sin precio', urgency: 'LOW' },
        timestamp: new Date().toISOString(),
      }
    }

    const positions = await getAlpacaPositions().catch(() => [])
    if (hasAlpacaPosition(positions, ticker)) {
      return {
        status: 'HOLD',
        ticker,
        direction: 'HOLD',
        reason: `${ticker}: posición Alpaca ya abierta`,
        signal: { confidence: 0, reasoning: 'Alpaca position exists', urgency: 'LOW' },
        timestamp: new Date().toISOString(),
      }
    }

    // Crypto: max open positions — HOLD only, never force-close for the limit
    if (asset === 'crypto') {
      const maxPos = cryptoLiveMaxPositions()
      const cryptoOpen = positions.filter((p) => {
        const sym = String(p.symbol ?? "").replace("/", "").toUpperCase()
        return isAlpacaCryptoTicker(sym) && Math.abs(Number(p.qty ?? 0)) > 0
      }).length
      const openCount = Math.max(cryptoOpen, account.openPositionsCount)
      if (openCount >= maxPos) {
        return {
          status: 'HOLD',
          ticker,
          direction: 'HOLD',
          reason: `límite ${maxPos} posiciones`,
          signal: { confidence: 0, reasoning: `Max ${maxPos} crypto positions`, urgency: 'LOW' },
          timestamp: new Date().toISOString(),
        }
      }
      if (isRebuyCooldownActive(ticker)) {
        return {
          status: 'HOLD',
          ticker,
          direction: 'HOLD',
          reason: `${ticker}: cooldown 6h post-venta`,
          signal: { confidence: 0, reasoning: 'Rebuy cooldown 6h', urgency: 'LOW' },
          timestamp: new Date().toISOString(),
        }
      }
    }

    const strategy = await evaluateAlpacaStrategy(ticker, quote.price)
    const signal = {
      direction: strategy.direction,
      confidence: strategy.confidence,
      reasoning: strategy.reasoning,
      urgency: strategy.urgency,
      primaryStrategy: strategy.primaryStrategy,
      stopLoss: strategy.stopLoss,
      takeProfit: strategy.takeProfit,
    }

    if (signal.direction === 'HOLD') {
      return {
        status: 'HOLD',
        ticker,
        direction: 'HOLD',
        reason: signal.reasoning,
        signal: { confidence: signal.confidence, reasoning: signal.reasoning, urgency: signal.urgency },
        timestamp: new Date().toISOString(),
        stopLoss: signal.stopLoss,
        takeProfit: signal.takeProfit,
      }
    }

    if (signal.confidence < (cycleOpts?.minBuyConfidence ?? TRADING_CONFIG.ai.minConfidenceToTrade)) {
      const minConf = cycleOpts?.minBuyConfidence ?? TRADING_CONFIG.ai.minConfidenceToTrade
      return {
        status: 'REJECTED_CONFIDENCE',
        ticker,
        direction: 'BUY',
        reason: `Confianza ${(signal.confidence * 100).toFixed(0)}% < mínimo ${(minConf * 100).toFixed(0)}%`,
        signal: { confidence: signal.confidence, reasoning: signal.reasoning, urgency: signal.urgency },
        timestamp: new Date().toISOString(),
      }
    }

    if (execGate) execGate.buySignal = true

    recordSignalForTelegram({
      ticker,
      direction: 'BUY',
      confidence: signal.confidence,
      at: new Date().toISOString(),
    })

    if (execGate) execGate.enteredAutoExecute = true
    try {
      if (asset === 'forex') {
        // SHADOW: evaluate London/NY strategies — never place orders
        const { evaluateForexShadowStrategies, isForexShadowMode } = await import(
          '@/lib/trading/forex/shadow-strategies'
        )
        const { appendJournalTrade } = await import('@/lib/trading/journal/trades')
        const bars = await getRecentBars(ticker, 80).catch(() => [])
        const ohlcv = bars.map((b) => ({
          open: b.open,
          high: b.high,
          low: b.low,
          close: b.close,
          volume: b.volume,
          date: b.time,
        }))
        const shadow = evaluateForexShadowStrategies(ticker, ohlcv, ohlcv)
        if (shadow.direction !== 'HOLD' && shadow.strategyId) {
          appendJournalTrade({
            at: new Date().toISOString(),
            market: 'forex',
            strategy: shadow.strategyId,
            ticker,
            side: shadow.direction === 'SELL' ? 'SELL' : 'BUY',
            entry: quote.price,
            exit: null,
            exitReason: null,
            grossPnlUsd: null,
            costsUsd: 0,
            netPnlUsd: null,
            rMultiple: null,
            durationMs: null,
            shadow: true,
            open: true,
          })
          console.log(
            `[Forex/SHADOW] ${ticker} ${shadow.direction} ${shadow.strategyId} ` +
              `conf=${(shadow.confidence * 100).toFixed(0)}% @${quote.price} ` +
              `(orders=${isForexShadowMode() ? 'DISABLED' : 'still-analysisOnly'})`,
          )
          return {
            status: 'HOLD',
            ticker,
            direction: shadow.direction === 'SELL' ? 'HOLD' : 'BUY',
            price: quote.price,
            agents: shadow.strategyId,
            reason: `[SHADOW] ${shadow.reasoning}`,
            signal: {
              confidence: shadow.confidence,
              reasoning: shadow.reasoning,
              urgency: 'MEDIUM',
            },
            timestamp: new Date().toISOString(),
            stopLoss: shadow.stopLoss,
            takeProfit: shadow.takeProfit,
          }
        }
        return {
          status: 'HOLD',
          ticker,
          direction: 'HOLD',
          reason: `${ticker}: forex SHADOW — ${shadow.reasoning}`,
          signal: {
            confidence: signal.confidence,
            reasoning: signal.reasoning,
            urgency: signal.urgency,
          },
          timestamp: new Date().toISOString(),
          stopLoss: signal.stopLoss,
          takeProfit: signal.takeProfit,
        }
      }

      const submitted = await placeAlpacaOrder({
        symbol: ticker,
        side: 'buy',
        type: 'market',
        notional: ALPACA_CRYPTO_ORDER_NOTIONAL_USD,
      })

      console.log(
        `[AutoExecute] ${ticker} → Alpaca PAPER ${submitted.side} ${submitted.symbol} id=${submitted.id} status=${submitted.status}`,
      )

      const estShares =
        quote.price > 0 ? ALPACA_CRYPTO_ORDER_NOTIONAL_USD / quote.price : 0
      if (asset === 'crypto') {
        const { registerCryptoExitPosition } = await import(
          '@/lib/trading/exit-manager'
        )
        registerCryptoExitPosition({
          symbol: ticker,
          entryPrice: quote.price,
          stopLoss: signal.stopLoss,
          takeProfit: signal.takeProfit,
          qty: estShares,
          strategy: signal.primaryStrategy,
          orderId: submitted.id,
        })
      } else {
        await registerExecutedPosition({
          ticker,
          shares: estShares,
          entryPrice: quote.price,
          stopLoss: signal.stopLoss,
          takeProfit: signal.takeProfit,
          orderId: submitted.id,
        }).catch((err) =>
          console.warn(
            `[PositionMonitor] register Alpaca ${ticker}:`,
            err instanceof Error ? err.message : err,
          ),
        )
      }

      return {
        status: 'EXECUTED',
        orderId: submitted.id,
        ticker,
        direction: 'BUY',
        sharesOrValue: asset === 'crypto' ? ALPACA_CRYPTO_ORDER_NOTIONAL_USD : ALPACA_FOREX_ORDER_UNITS,
        price: quote.price,
        agents: signal.primaryStrategy,
        reason: `Alpaca paper ${signal.primaryStrategy}: ${signal.reasoning}`,
        signal: { confidence: signal.confidence, reasoning: signal.reasoning, urgency: signal.urgency },
        timestamp: new Date().toISOString(),
        stopLoss: signal.stopLoss,
        takeProfit: signal.takeProfit,
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Alpaca order failed'
      console.error(`[AutoExecute] ${ticker} → ERROR Alpaca: ${msg}`)
      return {
        status: 'ERROR',
        ticker,
        direction: 'BUY',
        reason: msg,
        signal: { confidence: signal.confidence, reasoning: signal.reasoning, urgency: signal.urgency },
        timestamp: new Date().toISOString(),
      }
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
    cycleOpts?: RunCycleOptions,
  ): Promise<OrderResult> {
    const kind = cycleOpts?.cycleKind ?? (cycleOpts?.explicitTickers ? "explicit" : "auto");

    // Risk Manager — drawdown diario (per-broker; thresholds: -3% conservative, -5% STOP)
    const dailyPnlPct =
      account.navUSD > 0 && Number.isFinite(account.dailyPnlUSD)
        ? (account.dailyPnlUSD / account.navUSD) * 100
        : 0
    if (dailyPnlPct <= -5 && kind !== "forex") {
      const brokerEnv = getCryptoBroker()
      const broker: BrokerId =
        kind === "crypto"
          ? brokerEnv === "kraken"
            ? "kraken"
            : brokerEnv === "ibkr" || isIbkrCryptoEnabled()
              ? "ibkr"
              : "alpaca"
          : "ibkr"
      const openingNav =
        getDayOpeningNav(broker) ??
        (account.navUSD - (Number.isFinite(account.dailyPnlUSD) ? account.dailyPnlUSD : 0))
      const reason = `Risk STOP: drawdown día ${dailyPnlPct.toFixed(1)}% > 5% (${broker.toUpperCase()})`
      const newlyStopped = activateBrokerDayStop({
        broker,
        reason,
        openingNav,
        currentNav: account.navUSD,
        dailyPnlPct,
      })
      if (newlyStopped) {
        void TradingEngine.notifyBrokerDayStopTelegram({
          broker,
          openingNav,
          currentNav: account.navUSD,
          dailyPnlPct,
        })
      }
      return {
        status: 'SKIPPED',
        ticker,
        direction: 'HOLD',
        reason: `Risk STOP drawdown ${dailyPnlPct.toFixed(1)}% (${broker})`,
        signal: { confidence: 0, reasoning: 'Daily drawdown halt', urgency: 'HIGH' },
        timestamp: new Date().toISOString(),
      }
    }

    if (kind === "stocks") {
      if (
        isAlpacaCryptoTicker(ticker) ||
        isAlpacaForexTicker(ticker) ||
        isIbkrCryptoTicker(ticker) ||
        toAlpacaCryptoPairId(ticker)
      ) {
        return {
          status: "SKIPPED",
          ticker,
          direction: "HOLD",
          reason: `${ticker}: fuera de ciclo stocks`,
          signal: notAnalyzedSignal("fuera de ciclo stocks"),
          timestamp: new Date().toISOString(),
        };
      }
      if (isOtcPinkNonExecutable(ticker)) {
        return {
          status: "SKIPPED",
          ticker,
          direction: "HOLD",
          reason: `${ticker}: OTC/PINK — excluido del universo ejecutable`,
          signal: notAnalyzedSignal("OTC/PINK no ejecutable"),
          timestamp: new Date().toISOString(),
        };
      }
      if (
        isIbkrNonExecutableUsEtf(ticker) ||
        (!isEuropeanEurEquity(ticker) && !isIbkrExecutableEquity(ticker))
      ) {
        return {
          status: "SKIPPED",
          ticker,
          direction: "HOLD",
          reason: `${ticker}: ETF indicador (PRIIPs / no ejecutable IBKR UE)`,
          signal: notAnalyzedSignal("ETF indicador / no ejecutable"),
          timestamp: new Date().toISOString(),
        };
      }
      if (isIbkrNonTradable(ticker)) {
        const entry = getIbkrNonTradableEntry(ticker);
        const manual = entry && /^ManualBlock$/i.test(entry.ibkrStatus);
        const reason = manual
          ? `${ticker}: bloqueo manual — ${entry.message}`
          : `${ticker}: en lista IBKR non-tradable (${entry?.ibkrStatus ?? "blocked"}${
              entry?.code != null ? `/${entry.code}` : ""
            }${entry?.message ? ` — ${entry.message}` : ""})`;
        return {
          status: "SKIPPED",
          ticker,
          direction: "HOLD",
          reason,
          signal: notAnalyzedSignal(manual ? "bloqueo manual" : "IBKR non-tradable"),
          timestamp: new Date().toISOString(),
        };
      }
      // Session gates before analysis: EU local vs US/ADR
      if (isEuropeanEurEquity(ticker)) {
        const euSess = getEquityStrategySession(ticker)
        if (!isEuropeanEurEquityRegularSession(ticker)) {
          return {
            status: "HOLD",
            ticker,
            direction: "HOLD",
            reason: `${ticker}: fuera de sesión EU (${euSess.localTime} ${euSess.timeZone}; ${euSess.sessionLabel})`,
            signal: notAnalyzedSignal("fuera de sesión regular EU"),
            timestamp: new Date().toISOString(),
          };
        }
      } else if (isUsPremarketSession()) {
        // US premarket: analyze + shadow (or live behind STOCKS_EXECUTION_PREMARKET)
      } else if (!isUsListedEquityOrderWindow()) {
        return {
          status: "HOLD",
          ticker,
          direction: "HOLD",
          reason: `${ticker}: fuera de sesión regular NYSE (09:30–16:00 ET) — ADR/US solo con NY abierto`,
          signal: notAnalyzedSignal("fuera de sesión regular NYSE"),
          timestamp: new Date().toISOString(),
        };
      }
    }

    if (kind === "crypto") {
      if (isKrakenCryptoBroker()) {
        if (!isKrakenEurPair(ticker)) {
          return {
            status: "SKIPPED",
            ticker,
            direction: "HOLD",
            reason: `${ticker}: fuera de ciclo crypto Kraken EUR`,
            signal: { confidence: 0, reasoning: "Non-Kraken-EUR ticker", urgency: "LOW" },
            timestamp: new Date().toISOString(),
          };
        }
        return this.processKrakenTicker(ticker, account, execGate, cycleOpts)
      }
      if (isIbkrCryptoEnabled()) {
        if (!isIbkrCryptoTicker(ticker)) {
          return {
            status: "SKIPPED",
            ticker,
            direction: "HOLD",
            reason: `${ticker}: fuera de ciclo crypto IBKR/PAXOS`,
            signal: { confidence: 0, reasoning: "Non-IBKR-crypto ticker", urgency: "LOW" },
            timestamp: new Date().toISOString(),
          };
        }
        if (isIbkrNonTradable(ticker)) {
          return {
            status: "SKIPPED",
            ticker,
            direction: "HOLD",
            reason: `${ticker}: en lista IBKR non-tradable`,
            signal: { confidence: 0, reasoning: "IBKR non-tradable cache", urgency: "LOW" },
            timestamp: new Date().toISOString(),
          };
        }
        // Fall through to IBKR CRYPTO/PAXOS path below
      } else if (!toAlpacaCryptoPairId(ticker)) {
        return {
          status: "SKIPPED",
          ticker,
          direction: "HOLD",
          reason: `${ticker}: fuera de ciclo crypto`,
          signal: { confidence: 0, reasoning: "Non-crypto ticker", urgency: "LOW" },
          timestamp: new Date().toISOString(),
        };
      }
    }

    if (kind === "forex" && !isAlpacaForexTicker(ticker)) {
      return {
        status: "SKIPPED",
        ticker,
        direction: "HOLD",
        reason: `${ticker}: fuera de ciclo forex`,
        signal: { confidence: 0, reasoning: "Non-forex ticker", urgency: "LOW" },
        timestamp: new Date().toISOString(),
      };
    }

    // Alpaca paper path — skipped when crypto uses IBKR PAXOS or Kraken
    if (!(kind === "crypto" && (isIbkrCryptoEnabled() || isKrakenCryptoBroker()))) {
      const alpacaCryptoId = toAlpacaCryptoPairId(ticker)
      if (alpacaCryptoId) {
        return this.processAlpacaTicker(alpacaCryptoId, account, execGate, cycleOpts)
      }

      if (isAlpacaForexTicker(ticker)) {
        return this.processAlpacaTicker(ticker, account, execGate, cycleOpts)
      }

      if (isAlpacaTicker(ticker)) {
        return this.processAlpacaTicker(ticker, account, execGate, cycleOpts)
      }
    }

    if (isTimeoutSkipped(ticker)) {
      console.log(`[AutoExecute] ${ticker} → skip (timeout IBKR, lista temporal 30m)`)
      return {
        status: 'SKIPPED',
        ticker,
        direction: 'HOLD',
        reason: `${ticker}: skip temporal post-timeout IBKR`,
        signal: notAnalyzedSignal('timeout IBKR 30m'),
        timestamp: new Date().toISOString(),
      }
    }

    if (kind === 'stocks' && !isIbkrCryptoTicker(ticker) && isSymbolBrokerBrakedToday(ticker)) {
      console.log(`[AutoExecute] ${ticker} → skip (BROKER_NO_ACK_BRAKE hoy UTC)`)
      return {
        status: 'SKIPPED',
        ticker,
        direction: 'HOLD',
        reason: `${ticker}: bloqueado hoy por freno del broker (NO_ACK/rechazo)`,
        signal: notAnalyzedSignal('BROKER_NO_ACK_BRAKE hoy'),
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
        signal: notAnalyzedSignal('ticker excluido / heredado'),
        timestamp: new Date().toISOString(),
      }
    }

    const inUsPremarket =
      kind === 'stocks' &&
      !isEuropeanEurEquity(ticker) &&
      !isIbkrCryptoTicker(ticker) &&
      isUsPremarketSession()

    console.log(
      `[AutoExecute] ${ticker} → obteniendo precio ` +
        `${inUsPremarket ? '(premarket EODHD-WS + 1m QC)' : '(EODHD-WS/EU REST/Alpaca)'}…`,
    )
    let priceData: Awaited<ReturnType<typeof fetchTradingPrice>>
    try {
      if (inUsPremarket) {
        const pmQuote = await fetchPremarketUsPrice(ticker)
        if (!pmQuote) {
          return {
            status: 'SKIPPED',
            ticker,
            direction: 'HOLD',
            reason: `${ticker}: sin precio premarket live (nunca prior-close)`,
            signal: notAnalyzedSignal('sin precio premarket live'),
            timestamp: new Date().toISOString(),
          }
        }
        priceData = pmQuote
      } else {
        priceData = await this.fetchPrice(ticker)
      }
      console.log(
        `[AutoExecute] ${ticker} → precio: $${priceData.currentPrice.toFixed(2)} (${priceData.quoteRoute})`,
      )
    } catch {
      console.log(`[Universe] ${ticker} sin precio, skip`)
      return {
        status: 'SKIPPED',
        ticker,
        direction: 'HOLD',
        reason: `${ticker}: sin precio (EODHD/IBKR)`,
        signal: notAnalyzedSignal('sin precio'),
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
        signal: notAnalyzedSignal('precio 0 / no operable'),
        timestamp: new Date().toISOString(),
      }
    }

    const quoteExchange = priceData.quoteExchange ?? 'SMART'
    const usSession = !isIbkrCryptoTicker(ticker) && US_QUOTE_EXCHANGES.has(quoteExchange.toUpperCase())
      ? getUsMarketSession()
      : null

    if (usSession && kind === 'stocks' && !isEuropeanEurEquity(ticker)) {
      const premarketSession =
        usSession.phase === 'PRE_MARKET' && isUsPremarketSession()
      if (
        !premarketSession &&
        (!usSession.isTradeable || !isUsListedEquityOrderWindow())
      ) {
        return {
          status: 'HOLD', ticker, direction: 'HOLD',
          reason: `${ticker}: fuera de sesión regular NYSE (${usSession.sessionLabel})`,
          signal: notAnalyzedSignal('fuera de sesión regular NYSE'),
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
        signal: notAnalyzedSignal('posición ya abierta'),
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

    const analysisSnap = analyzedSignalFromStrategy(strategy, priceData.currentPrice)

    if (signal.direction === 'HOLD') {
      // evaluateProStrategies already logged "[ProStrategy] TICKER: ninguna..."
      return {
        status: 'HOLD', ticker, direction: 'HOLD',
        reason: signal.reasoning,
        signal: analysisSnap,
        timestamp: new Date().toISOString(),
        stopLoss: strategy.stopLoss > 0 ? strategy.stopLoss : undefined,
        takeProfit: strategy.takeProfit > 0 ? strategy.takeProfit : undefined,
      }
    }

    // USA premarket: shadow by default; live only if STOCKS_EXECUTION_PREMARKET + readiness
    let usPremarketLive = false
    if (inUsPremarket) {
      const quoteCheck = isUsablePremarketQuote({
        price: priceData.currentPrice,
        previousClose: priceData.previousClose,
        bid: priceData.bid,
        ask: priceData.ask,
        volume: priceData.volume,
        updatedAt: priceData.quoteUpdatedAt,
        quoteRoute: priceData.quoteRoute,
      })
      if (!quoteCheck.ok) {
        console.log(`[AutoExecute] ${ticker} → Premarket skip: ${quoteCheck.reason}`)
        return {
          status: 'HOLD',
          ticker,
          direction: 'HOLD',
          reason: `${ticker}: ${quoteCheck.reason}`,
          signal: {
            ...analysisSnap,
            reasoning: `${analysisSnap.reasoning} [premarket skip]`,
          },
          timestamp: new Date().toISOString(),
        }
      }

      const switchOn = isStocksExecutionPremarketEnabled()
      const ready = isPremarketLiveReady()
      usPremarketLive = switchOn && ready
      if (!usPremarketLive) {
        recordPremarketShadowSignal({
          ticker,
          strategy: signal.primaryStrategy || 'PRO',
          entryPremarket: priceData.currentPrice,
          stopLoss: strategy.stopLoss > 0 ? strategy.stopLoss : undefined,
          takeProfit: strategy.takeProfit > 0 ? strategy.takeProfit : undefined,
        })
        const { appendJournalTrade } = await import('@/lib/trading/journal/trades')
        appendJournalTrade({
          at: new Date().toISOString(),
          market: 'stocks',
          strategy: signal.primaryStrategy || 'PRO',
          ticker,
          side: 'BUY',
          entry: priceData.currentPrice,
          exit: null,
          exitReason: null,
          grossPnlUsd: null,
          costsUsd: 0,
          netPnlUsd: null,
          rMultiple: null,
          durationMs: null,
          shadow: true,
          open: true,
        })
        const readiness = getPremarketLiveReadiness()
        const why = !switchOn
          ? 'STOCKS_EXECUTION_PREMARKET=false'
          : readiness.detail
        console.log(
          `[AutoExecute] ${ticker} → Premarket SHADOW @$${priceData.currentPrice.toFixed(2)} (${why})`,
        )
        return {
          status: 'HOLD',
          ticker,
          direction: 'HOLD',
          reason: `${ticker}: premarket shadow — ${why}`,
          signal: {
            ...analysisSnap,
            reasoning: `${analysisSnap.reasoning} [premarket shadow]`,
          },
          timestamp: new Date().toISOString(),
          stopLoss: strategy.stopLoss > 0 ? strategy.stopLoss : undefined,
          takeProfit: strategy.takeProfit > 0 ? strategy.takeProfit : undefined,
        }
      }
      console.log(
        `[AutoExecute] ${ticker} → Premarket LIVE path (switch+ready, size×${PREMARKET_SIZE_FACTOR})`,
      )
    }

    if (execGate) execGate.buySignal = true

    recordSignalForTelegram({
      ticker,
      direction: signal.direction,
      confidence: signal.confidence,
      at: new Date().toISOString(),
    })

    // Account-aware PRE_ORDER_RISK_CHECK + dynamic sizing (USD or EUR by listing).
    // Capital never filters the universe — unaffordable BUY → SIGNAL_NO_CAPITAL.
    // Crypto IBKR always sizes against dedicated PAXOS account (default U24225949).
    const cryptoIbkr = kind === 'crypto' && isIbkrCryptoEnabled()
    const euLocalStock = kind === 'stocks' && isEuropeanEurEquity(ticker)
    let stockCapital: StockAccountCapitalPick | null = null
    const richest = cryptoIbkr
      ? {
          accountId: cryptoIbkrAccountId(),
          cashUSD: 0,
        }
      : euLocalStock
        ? await pickIbkrStockAccountCapital(ticker).catch(() => null)
        : await pickIbkrAccountWithMostUsd().catch(() => ({
            accountId: null as string | null,
            cashUSD: 0,
          }))
    if (euLocalStock && richest && "currency" in richest) {
      stockCapital = richest as StockAccountCapitalPick
    }
    let capitalSnap = await fetchCapitalSnapshot().catch(() => null)
    if (stockCapital?.accountId) {
      capitalSnap =
        (await fetchCapitalSnapshotForAccount(stockCapital.accountId).catch(() => null)) ??
        capitalSnap
    }
    let cashForSizing = 0
    let sizingCurrency: 'USD' | 'EUR' = 'USD'
    let stockAccountId: string | null = null
    if (cryptoIbkr) {
      cashForSizing = Math.max(0, capitalSnap?.cashUSD ?? account.cashUSD)
      cashForSizing = Math.max(cashForSizing, cryptoLiveMaxNotionalUsd())
      account.primaryAccountId = cryptoIbkrAccountId()
    } else if (stockCapital) {
      sizingCurrency = stockCapital.currency
      stockAccountId = stockCapital.accountId
      cashForSizing = Math.max(0, stockCapital.usableCash)
      if (stockCapital.accountId) {
        account.primaryAccountId = stockCapital.accountId
        account.cashUSD = stockCapital.usableCash
      }
    } else {
      const usdPick = richest as { accountId: string | null; cashUSD: number }
      cashForSizing =
        usdPick.cashUSD > 0
          ? usdPick.cashUSD
          : Math.max(0, capitalSnap?.cashUSD ?? account.cashUSD)
      stockAccountId = usdPick.accountId
      if (usdPick.accountId) {
        account.primaryAccountId = usdPick.accountId
        if (usdPick.cashUSD > 0) account.cashUSD = usdPick.cashUSD
      }
    }

    const agentsLabel = signal.primaryStrategy || 'PRO'

    // Stocks: need cash ≥ 1 share. Crypto IBKR: fractional qty + CRYPTO_LIVE_MAX_NOTIONAL_USD.
    if (!(cashForSizing > 0) || (!cryptoIbkr && priceData.currentPrice > cashForSizing)) {
      return emitSignalNoCapital({
        ticker,
        confidence: signal.confidence,
        price: priceData.currentPrice,
        available: stockCapital?.cash ?? cashForSizing,
        usableCash: cashForSizing,
        detail: stockCapital?.detail,
        currency: sizingCurrency,
        accountId: stockAccountId,
        agents: agentsLabel,
        reasoning: signal.reasoning,
        urgency: signal.urgency,
      })
    }

    const capital = resolveAccountCapitalPolicy(
      stockAccountId ?? account.primaryAccountId ?? process.env.IBKR_ACCOUNT_ID,
      cashForSizing,
      signal.confidence,
      strategy.positionSizeFactor ?? 1,
    )
    if (
      priceData.currentPrice < capital.minPrice ||
      (Number.isFinite(capital.maxPrice) && priceData.currentPrice > capital.maxPrice)
    ) {
      console.warn(
        `[AutoExecute] ${ticker} BLOCKED: precio $${priceData.currentPrice.toFixed(2)} bajo mínimo ` +
          `$${capital.minPrice} (cuenta ${capital.accountId || 'default'})`,
      )
      return {
        status: 'REJECTED_RISK',
        ticker,
        direction: signal.direction,
        price: priceData.currentPrice,
        agents: agentsLabel,
        reason: `Precio $${priceData.currentPrice.toFixed(2)} < mínimo $${capital.minPrice}`,
        signal: analysisSnap,
        timestamp: new Date().toISOString(),
      }
    }

    const preRisk = await runPreOrderRiskCheck({
      ticker,
      price: priceData.currentPrice,
      confidence: signal.confidence,
      capital: capitalSnap ?? undefined,
    })
    logPreOrderDecision({
      ticker,
      allow: preRisk.allow,
      reason: preRisk.reason,
      price: priceData.currentPrice,
      qty: preRisk.qty,
      notional: preRisk.notional,
      stopLoss: preRisk.stopLoss,
      takeProfit: preRisk.takeProfit,
      confidence: signal.confidence,
      agents: agentsLabel,
      capital: preRisk.capital,
    })
    if (!preRisk.allow) {
      if (isCapitalAffordabilityReject(preRisk.reason)) {
        return emitSignalNoCapital({
          ticker,
          confidence: signal.confidence,
          price: priceData.currentPrice,
          available: stockCapital?.cash ?? cashForSizing,
          usableCash: cashForSizing,
          currency: sizingCurrency,
          accountId: stockAccountId,
          detail: stockCapital?.detail,
          agents: agentsLabel,
          reasoning: signal.reasoning,
          urgency: signal.urgency,
        })
      }
      return {
        status: 'REJECTED_RISK',
        ticker,
        direction: signal.direction,
        price: priceData.currentPrice,
        agents: agentsLabel,
        reason: preRisk.reason,
        signal: analysisSnap,
        timestamp: new Date().toISOString(),
      }
    }

    // Hard cap: máx posiciones abiertas (crypto IBKR usa CRYPTO_LIVE_MAX_POSITIONS)
    if (signal.direction === 'BUY') {
      const maxPos =
        kind === 'crypto' && isIbkrCryptoEnabled()
          ? cryptoLiveMaxPositions()
          : TRADING_CONFIG.risk.maxOpenPositions
      if (account.openPositionsCount >= maxPos) {
        return {
          status: kind === 'crypto' ? 'HOLD' : 'REJECTED_RISK',
          ticker,
          direction: kind === 'crypto' ? 'HOLD' : signal.direction,
          reason:
            kind === 'crypto'
              ? `límite ${maxPos} posiciones`
              : `Máximo ${maxPos} posiciones abiertas (${account.openPositionsCount})`,
          signal: analysisSnap,
          timestamp: new Date().toISOString(),
        }
      }
    }

    const strategySession = getEquityStrategySession(ticker)
    const phase = minConfidencePhaseForSession(strategySession)
    const minConfidence = minConfidenceForPhase(phase)

    if (signal.confidence < minConfidence) {
      return {
        status: 'REJECTED_CONFIDENCE', ticker, direction: signal.direction,
        reason: `Confianza ${(signal.confidence * 100).toFixed(0)}% < mínimo ${(minConfidence * 100).toFixed(0)}% (${phase})`,
        signal: analysisSnap,
        timestamp: new Date().toISOString(),
      }
    }

    const cycleKind = cycleOpts?.cycleKind ?? (cycleOpts?.explicitTickers ? "explicit" : "auto")
    const dailyDdPct =
      account.navUSD > 0 && Number.isFinite(account.dailyPnlUSD)
        ? (account.dailyPnlUSD / account.navUSD) * 100
        : 0
    const conservativeMode = dailyDdPct <= -3
    const minBuyThreshold =
      cycleOpts?.minBuyConfidence != null
        ? conservativeMode
          ? Math.max(0.8, cycleOpts.minBuyConfidence)
          : cycleOpts.minBuyConfidence
        : conservativeMode
          ? 0.8
          : cycleKind === "auto"
            ? AUTO_CYCLE_MIN_BUY_CONFIDENCE
            : 0.6

    if (cycleKind !== "explicit" && signal.confidence < minBuyThreshold) {
      return {
        status: 'HOLD',
        ticker,
        direction: 'HOLD',
        reason: `Confianza ${(signal.confidence * 100).toFixed(0)}% < umbral ${(minBuyThreshold * 100).toFixed(0)}% (${cycleKind}${conservativeMode ? ", conservador" : ""})`,
        signal: analysisSnap,
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
        signal: analysisSnap,
        timestamp: new Date().toISOString(),
      }
    }

    // Strategy SL/TP override — prefer ATR dynamic from pre-order risk
    const strategyStopLoss = signal.stopLoss
    const strategyTakeProfit = signal.takeProfit
    const riskOk = {
      ...riskCheck,
      stopLossPrice:
        strategyStopLoss > 0
          ? strategyStopLoss
          : preRisk.stopLoss > 0
            ? preRisk.stopLoss
            : riskCheck.stopLossPrice,
      takeProfitPrice:
        strategyTakeProfit > 0
          ? strategyTakeProfit
          : preRisk.takeProfit > 0
            ? preRisk.takeProfit
            : riskCheck.takeProfitPrice,
    }

    const sized = resolvePositionSize(
      {
        cashUSD: cashForSizing,
        availableFunds: cashForSizing,
        navUSD: account.navUSD > 0 ? account.navUSD : cashForSizing,
      },
      priceData.currentPrice,
      signal.confidence,
      { stopLossPrice: riskOk.stopLossPrice },
    )
    let resolvedShares = sized.qty > 0 ? sized.qty : preRisk.qty
    if (usPremarketLive) {
      try {
        assertPremarketLiveGates({
          bid: priceData.bid,
          ask: priceData.ask,
          volume: priceData.volume,
        })
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'premarket gate'
        console.warn(`[AutoExecute] ${ticker} BLOCKED premarket: ${msg}`)
        return {
          status: 'HOLD',
          ticker,
          direction: 'HOLD',
          reason: msg,
          signal: analysisSnap,
          timestamp: new Date().toISOString(),
        }
      }
      resolvedShares = Math.max(1, Math.floor(resolvedShares * PREMARKET_SIZE_FACTOR))
    }
    // Cap notional to available USD cash; if < 1 share → skip this cycle
    while (resolvedShares > 1 && resolvedShares * priceData.currentPrice > cashForSizing) {
      resolvedShares -= 1
    }
    if (kind === 'stocks') {
      const capped = applyInPlayShareCap({
        ticker,
        kind,
        shares: resolvedShares,
        price: priceData.currentPrice,
        fractional: sized.fractional,
      })
      resolvedShares = capped.shares
      sized.fractional = capped.fractional
    }
    // IBKR crypto live: hard notional cap (CRYPTO_LIVE_MAX_NOTIONAL_USD, default $25)
    if (kind === 'crypto' && isIbkrCryptoEnabled() && priceData.currentPrice > 0) {
      const maxNotional = Math.min(cryptoLiveMaxNotionalUsd(), cashForSizing > 0 ? cashForSizing : cryptoLiveMaxNotionalUsd())
      resolvedShares = maxNotional / priceData.currentPrice
      console.log(
        `[AutoExecute] ${ticker} crypto IBKR sizing notional≤$${maxNotional.toFixed(2)} qty=${resolvedShares}`,
      )
    }
    if (resolvedShares <= 0) {
      return emitSignalNoCapital({
        ticker,
        confidence: signal.confidence,
        price: priceData.currentPrice,
        available: stockCapital?.cash ?? cashForSizing,
        usableCash: sized.usableCash,
        limitingRule: sized.limitingRule,
        detail:
          (stockCapital?.detail ?? sized.reason) +
          (sized.fractional ? "; IBKR_FRACTIONAL sizing" : "; whole-share sizing"),
        currency: sizingCurrency,
        accountId: stockAccountId,
        agents: agentsLabel,
        reasoning: signal.reasoning,
        urgency: signal.urgency,
      })
    }
    // 1-share fallback may exceed 80% deployable but still fit in 95% cash — allow it
    if (
      !(kind === 'crypto' && isIbkrCryptoEnabled()) &&
      !sized.fractional &&
      resolvedShares >= 1 &&
      resolvedShares * priceData.currentPrice > cashForSizing * 0.95 + 1
    ) {
      return emitSignalNoCapital({
        ticker,
        confidence: signal.confidence,
        price: priceData.currentPrice,
        available: stockCapital?.cash ?? cashForSizing,
        usableCash: sized.usableCash,
        limitingRule: "price",
        detail: stockCapital?.detail ?? sized.reason,
        currency: sizingCurrency,
        accountId: stockAccountId,
        agents: agentsLabel,
        reasoning: signal.reasoning,
        urgency: signal.urgency,
      })
    }
    if (kind === 'stocks' && (process.env.IB_COST_GATE ?? 'true').trim().toLowerCase() !== 'false') {
      const gate = ibkrCostGate({
        ccy: sizingCurrency === 'EUR' ? 'EUR' : 'USD',
        shares: resolvedShares,
        price: priceData.currentPrice,
        targetPrice: riskOk.takeProfitPrice,
      })
      if (!gate.ok) {
        console.log(`[AutoExecute] ${ticker} → skip (coste): ${gate.reason}`)
        return {
          status: 'HOLD',
          ticker,
          direction: 'HOLD',
          reason: gate.reason,
          signal: analysisSnap,
          timestamp: new Date().toISOString(),
        }
      }
    }
    const orderValueUSD = resolvedShares * priceData.currentPrice
    const cashLabel =
      sizingCurrency === "EUR"
        ? `cashEUR €${cashForSizing.toFixed(2)}`
        : `cashUSD $${cashForSizing.toFixed(2)}`
    console.log(
      `[AutoExecute] ${ticker} → account=${stockAccountId ?? account.primaryAccountId ?? 'default'} ${cashLabel} | ` +
        `deployable $${sized.deployable.toFixed(2)} usable $${sized.usableCash.toFixed(2)} | ` +
        `precio $${priceData.currentPrice.toFixed(2)} | qty ${resolvedShares}` +
        (sized.fractional ? " (fractional)" : ""),
    )
    // Stocks: integer unless IBKR_FRACTIONAL_ENABLED; IBKR crypto always fractional OK
    if (!(kind === 'crypto' && isIbkrCryptoEnabled()) && !sized.fractional) {
      resolvedShares = Math.max(1, Math.floor(resolvedShares))
    }
    console.log(
      `[AutoExecute] ${ticker} BUY qty=${resolvedShares} precio=$${priceData.currentPrice.toFixed(2)} ` +
        `SL=$${riskOk.stopLossPrice.toFixed(2)} TP=$${riskOk.takeProfitPrice.toFixed(2)}`,
    )

    const suggested =
      signal.suggestedLimitPrice != null && signal.suggestedLimitPrice > 0
        ? signal.suggestedLimitPrice
        : undefined
    const mid = midFromBidAsk(priceData.bid, priceData.ask)
    const premarketLmt = usPremarketLive
      ? premarketLimitPrice('BUY', priceData.bid, priceData.ask)
      : null
    const limitPrice =
      (premarketLmt != null && premarketLmt > 0 ? premarketLmt : undefined) ??
      suggested ??
      (priceData.currentPrice > 0 ? priceData.currentPrice : undefined) ??
      mid ??
      undefined
    if (limitPrice == null) {
      return {
        status: 'HOLD', ticker, direction: 'BUY',
        reason: `Sin limitPrice para ${ticker}`,
        signal: analysisSnap,
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
        signal: analysisSnap,
        timestamp: new Date().toISOString(),
      }
    }

    if (cycleOpts?.analysisOnly && signal.direction === 'BUY') {
      const tag =
        cycleOpts.cycleKind === 'stocks'
          ? 'Análisis stocks (ejecución deshabilitada/pausada)'
          : 'Análisis forex'
      return {
        status: 'HOLD',
        ticker,
        direction: 'HOLD',
        reason: `[${tag}] ${signal.reasoning}`,
        signal: analysisSnap,
        timestamp: new Date().toISOString(),
        stopLoss: effectiveStopLoss,
        takeProfit: effectiveTakeProfit,
      }
    }

    // Per-market switches (US/EU) — analyze OK, block BUY before enqueue
    if (cycleOpts?.cycleKind === 'stocks' && signal.direction === 'BUY') {
      const dynamicGate = await gateStocksDynamicCategories({
        ticker,
        entry: priceData.currentPrice,
        effectiveStopLoss,
        effectiveTakeProfit,
        resolvedShares,
        bid: priceData.bid,
        ask: priceData.ask,
        primaryStrategy: signal.primaryStrategy,
      })
      if (dynamicGate && 'status' in dynamicGate) {
        return {
          status: 'HOLD',
          ticker,
          direction: 'HOLD',
          reason: dynamicGate.reason,
          signal: {
            ...analysisSnap,
            reasoning: `${analysisSnap.reasoning} ${dynamicGate.reasoningSuffix}`,
          },
          timestamp: new Date().toISOString(),
          stopLoss: dynamicGate.stopLoss,
          takeProfit: dynamicGate.takeProfit,
        }
      }

      const eu = isEuropeanEurEquity(ticker)
      if (eu && !isStocksExecutionEuEnabled()) {
        return {
          status: 'HOLD',
          ticker,
          direction: 'HOLD',
          reason: `[STOCKS_EXECUTION_EU=false] ${signal.reasoning}`,
          signal: analysisSnap,
          timestamp: new Date().toISOString(),
          stopLoss: effectiveStopLoss,
          takeProfit: effectiveTakeProfit,
        }
      }
      if (!eu && !isStocksExecutionUsEnabled()) {
        return {
          status: 'HOLD',
          ticker,
          direction: 'HOLD',
          reason: `[STOCKS_EXECUTION_US=false] ${signal.reasoning}`,
          signal: analysisSnap,
          timestamp: new Date().toISOString(),
          stopLoss: effectiveStopLoss,
          takeProfit: effectiveTakeProfit,
        }
      }
    }

    const pending = this.approvals.enqueue({
      ticker,
      direction: signal.direction,
      shares: resolvedShares,
      fractional: sized.fractional,
      cashQtyUsd: sized.fractional ? sized.deployable : undefined,
      orderType: signal.suggestedOrderType || 'LMT',
      limitPrice,
      orderValueUSD,
      price: priceData.currentPrice,
      stopLoss: effectiveStopLoss,
      takeProfit: effectiveTakeProfit,
      reason: signal.reasoning,
      signal: analysisSnap,
      outsideRth: isIbkrCryptoTicker(ticker) ? true : usPremarketLive ? true : usExtendedHours,
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

    const instantEligible =
      signal.confidence >= (cycleOpts?.minBuyConfidence ?? minBuyThreshold) &&
      orderValueUSD <= TradingEngine.INSTANT_EXEC_MAX_NOTIONAL_USD

    const needsManualTelegram =
      TRADING_CONFIG.semiAutomatic.telegramApprovalRequired &&
      (!instantEligible ||
        signal.confidence < TradingEngine.MANUAL_APPROVAL_CONFIDENCE ||
        orderValueUSD > TradingEngine.INSTANT_EXEC_MAX_NOTIONAL_USD)

    if (needsManualTelegram) {
      console.log(
        `[Signal] ${ticker}: ${signal.primaryStrategy} conf=${(signal.confidence * 100).toFixed(0)}% → PENDING_APPROVAL (Telegram)`,
      )
      void notifyPendingApproval({
        ticker,
        direction: 'BUY',
        entry: priceData.currentPrice,
        stopLoss: effectiveStopLoss,
        takeProfit: effectiveTakeProfit,
        confidence: signal.confidence,
        approvalId: pending.approvalId,
        shares: resolvedShares,
        orderValueUSD,
        reasoning: signal.reasoning,
        cycleChannel: cycleKind === 'stocks' || cycleKind === 'crypto' || cycleKind === 'forex' ? cycleKind : undefined,
      }).catch((err) => {
        console.warn(
          '[TradingEngine] notifyPendingApproval error:',
          err instanceof Error ? err.message : err,
        )
      })
      return {
        status: 'PENDING_APPROVAL',
        approvalId: pending.approvalId,
        ticker,
        direction: 'BUY',
        sharesOrValue: resolvedShares,
        price: priceData.currentPrice,
        agents: agentsLabel,
        reason: signal.reasoning,
        signal: analysisSnap,
        timestamp: new Date().toISOString(),
        stopLoss: effectiveStopLoss,
        takeProfit: effectiveTakeProfit,
      }
    }

    console.log(`[Signal] ${ticker} → auto-ejecutar instantáneo (notional=$${orderValueUSD.toFixed(0)})`)
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
            `[AutoExecute] ${ticker} → EXECUTED sin ibkrId confirmado (orderId=${oid || 'n/a'})`,
          )
        }
        void notifyInstantExecution({
          ticker,
          shares: resolvedShares,
          price: priceData.currentPrice,
          confidence: signal.confidence,
          strategy: signal.primaryStrategy,
          stopLoss: effectiveStopLoss,
          takeProfit: effectiveTakeProfit,
          channel: cycleKind === 'stocks' || cycleKind === 'crypto' || cycleKind === 'forex' ? cycleKind : 'stocks',
        }).catch(() => undefined)
        // Telegram digest also from registerExecutedPosition when ibkrId is real
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
        signal: analysisSnap,
        timestamp: new Date().toISOString(),
        stopLoss: effectiveStopLoss,
        takeProfit: effectiveTakeProfit,
      }
    }
  }

  private emptyAccountSnapshot(): {
    navUSD: number
    cashUSD: number
    dailyPnlUSD: number
    openPositionsCount: number
    primaryAccountId: string | null
  } {
    return {
      navUSD: 0,
      cashUSD: 0,
      dailyPnlUSD: 0,
      openPositionsCount: 0,
      primaryAccountId: null,
    }
  }

  /** Account snapshot by cycle kind — crypto=Alpaca or IBKR(PAXOS), forex=soft fail, stocks=IBKR. */
  private async fetchAccountSnapshotForKind(kind: CycleKind): Promise<{
    navUSD: number
    cashUSD: number
    dailyPnlUSD: number
    openPositionsCount: number
    primaryAccountId?: string | null
  }> {
    if (kind === "crypto") {
      if (isKrakenCryptoBroker()) {
        if (!isKrakenConfigured()) {
          throw new Error("Kraken no configurado (KRAKEN_API_KEY / KRAKEN_API_SECRET)")
        }
        const adapter = getKrakenAdapter()
        await adapter.warmPairMeta().catch(() => undefined)
        const [acct, positions] = await Promise.all([
          adapter.getAccount(),
          adapter.getPositions().catch(() => []),
        ])
        const cash = acct.cashEur
        const equity =
          cash +
          positions.reduce((s, p) => s + (Number.isFinite(p.marketValueEur) ? p.marketValueEur : 0), 0)
        const { countConfirmedLivePositions } = await import(
          "@/lib/trading/crypto/position-filters"
        )
        const { journalOpenCryptoPairs } = await import(
          "@/lib/trading/crypto/journal-crypto"
        )
        const openPositionsCount = countConfirmedLivePositions(
          positions,
          journalOpenCryptoPairs(),
        )
        console.log(
          `[Cycle/crypto] account source=KRAKEN cash=€${cash.toFixed(2)} equity≈€${equity.toFixed(2)} ` +
            `positions=${openPositionsCount} (raw=${positions.length})`,
        )
        return {
          navUSD: equity,
          cashUSD: cash, // EUR cash stored in cashUSD field for sizing
          dailyPnlUSD: 0,
          openPositionsCount,
          primaryAccountId: "KRAKEN",
        }
      }
      if (isIbkrCryptoEnabled()) {
        const [snap, richest] = await Promise.all([
          fetchTradingAccountSnapshot(),
          pickIbkrAccountWithMostUsd(),
        ])
        console.log(
          `[Cycle/crypto] account source=IBKR/PAXOS ` +
            `account=${richest.accountId ?? "default"} cashUSD=$${richest.cashUSD.toFixed(2)} ` +
            `nav=$${snap.navUSD.toFixed(2)}`,
        )
        return {
          navUSD: snap.navUSD,
          cashUSD: richest.cashUSD > 0 ? richest.cashUSD : snap.cashUSD,
          dailyPnlUSD: snap.dailyPnlUSD,
          openPositionsCount: snap.openPositionsCount,
          primaryAccountId: richest.accountId ?? snap.primaryAccountId,
        }
      }
      if (!isAlpacaConfigured()) {
        throw new Error("Alpaca paper no configurado (ALPACA_API_KEY / ALPACA_SECRET)")
      }
      const [acct, positions] = await Promise.all([
        getAlpacaAccount(),
        getAlpacaPositions().catch(() => []),
      ])
      const cash = Number(acct.cash ?? acct.buyingPower ?? 0)
      const equity = Number(acct.equity ?? acct.portfolioValue ?? cash)
      const lastEquity = Number(acct.lastEquity ?? 0)
      // Alpaca daily P&L = equity − last_equity (never IBKR UnrealizedPnL)
      const dailyPnlUSD =
        lastEquity > 0 && Number.isFinite(equity) ? equity - lastEquity : 0
      const openPositionsCount = Array.isArray(positions)
        ? positions.filter((p) => Math.abs(Number(p.qty ?? 0)) > 0).length
        : 0
      console.log(
        `[Cycle/crypto] account source=ALPACA cash=$${cash.toFixed(2)} equity=$${equity.toFixed(2)} ` +
          `last_equity=$${lastEquity.toFixed(2)} dailyPnl=$${dailyPnlUSD.toFixed(2)} positions=${openPositionsCount}`,
      )
      return {
        navUSD: equity,
        cashUSD: cash,
        dailyPnlUSD,
        openPositionsCount,
        primaryAccountId: acct.id || "ALPACA",
      }
    }

    if (kind === "forex") {
      // Analysis-only — never block on IBKR account snapshot
      console.log(`[Cycle/forex] account source=NONE cash=$0 (analysis-only, no IBKR required)`)
      return this.emptyAccountSnapshot()
    }

    // stocks / auto / explicit → IBKR
    try {
      const snap = await fetchTradingAccountSnapshot()
      // Risk limits: only ForgeOS-owned positions (never PTPI/HYDC/… orphans)
      let forgeosCount = snap.openPositionsCount
      try {
        const { fetchCachedIbkrPositions } = await import("@/lib/trading/ibkr-data")
        const { isForgeOsOpenedPosition, isLegacyOrphanTicker } = await import(
          "@/lib/trading/forgeos-owned"
        )
        const rows = await fetchCachedIbkrPositions()
        forgeosCount = rows.filter(
          (p) =>
            !isLegacyOrphanTicker(p.symbol) && isForgeOsOpenedPosition(p.symbol),
        ).length
      } catch {
        /* keep broker count */
      }
      console.log(
        `[Cycle/${kind}] account source=IBKR cash=$${snap.cashUSD.toFixed(2)} nav=$${snap.navUSD.toFixed(2)} forgeosPositions=${forgeosCount}`,
      )
      return {
        navUSD: snap.navUSD,
        cashUSD: snap.cashUSD,
        dailyPnlUSD: snap.dailyPnlUSD,
        openPositionsCount: forgeosCount,
        primaryAccountId: snap.primaryAccountId,
      }
    } catch {
      throw new Error("No se pudo obtener snapshot de cuenta")
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
    fractional?: boolean
    cashQtyUsd?: number
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
    let account = process.env.IBKR_ACCOUNT_ID?.trim() || undefined
    // Crypto IBKR always on dedicated PAXOS account (default U24225949)
    if (isIbkrCryptoTicker(params.ticker) && isIbkrCryptoEnabled()) {
      account = cryptoIbkrAccountId()
    } else if (isEuropeanEurEquity(params.ticker)) {
      // EU local listings (EUR) always go to the EUR cash account — never the
      // "richest USD" account (REP was sent to U24225949 and rejected).
      account = ibkrEurStocksAccountId()
    } else {
      // Always route to the account with most positive USD (never USD-negative)
      const richest = await pickIbkrAccountWithMostUsd().catch(() => ({
        accountId: null as string | null,
        cashUSD: 0,
      }))
      if (richest.accountId && richest.cashUSD > 0) {
        account = richest.accountId
      }
      if (params.direction !== 'SELL' && !(richest.cashUSD > 0)) {
        throw new Error('capital insuficiente — ninguna cuenta con cashUSD > 0')
      }
    }
    console.log(
      `[AutoExecute] ${params.ticker} ${side} → llamando submitSupervisedLiveLimitOrder ` +
        `qty=${params.shares} limitSuggested=$${params.limitPrice ?? 'n/a'} account=${account ?? 'default'} outsideRth=${params.outsideRth ?? true}`,
    )

    let limitPrice: number
    try {
      limitPrice = await fetchLiveLimitPrice({
        symbol: params.ticker,
        side,
        asset: isIbkrCryptoTicker(params.ticker) ? 'CRYPTO' : 'STK',
        suggested: params.limitPrice,
      })
      // Aggressive crypto sells: price − 0.5%
      if (side === 'SELL' && isIbkrCryptoTicker(params.ticker) && isIbkrCryptoEnabled()) {
        const { cryptoSellAggressiveDiscountPct } = await import('@/lib/trading/crypto/config')
        limitPrice = Number((limitPrice * (1 - cryptoSellAggressiveDiscountPct())).toFixed(8))
      }
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
        fractional: params.fractional,
        cashQtyUsd: params.cashQtyUsd,
        stopLoss: side === 'BUY' && !params.fractional ? params.stopLoss : undefined,
        takeProfit: side === 'BUY' && !params.fractional ? params.takeProfit : undefined,
        tif: side === 'BUY' && !isIbkrCryptoTicker(params.ticker) ? 'GTC' : 'DAY',
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
      if (err instanceof IbkrOrderRejectedError) {
        if (
          shouldPersistIbkrNonTradable({
            code: err.code,
            ibkrStatus: err.ibkrStatus,
            message: err.message,
          })
        ) {
          void recordIbkrNonTradable({
            symbol: params.ticker,
            code: err.code,
            message: err.message,
            ibkrStatus: err.ibkrStatus,
          })
        }
      }
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
