/**
 * Phase G — Portfolio Optimizer for ForgeOS Investment.
 *
 * Kelly sizing, correlation gate, 70/30 horizon split, defensive mode,
 * soft weekly rebalance, and SPY benchmark comparison.
 *
 * ANALYSIS_ONLY / paper-safe by default:
 * - Emits recommendations + size caps for RiskManager / TradingEngine
 * - Does NOT place unsupervised live reduce/close orders
 * - Never invents P&L or win-rate (NO_DATA → conservative Kelly)
 */

import "server-only"

import fs from "node:fs"
import path from "node:path"

import { getBatchPrices, getDailyBars } from "@/lib/market-data/yahoo-finance"
import { getMacroContext } from "@/lib/market-data/macro-context"
import { fetchTradingOpenSymbols } from "@/lib/trading/ibkr-data"
import { loadTradingState, type MonitoredPosition } from "./trading-state-store"
import { TRADING_CONFIG } from "./trading.config"

// ── Feature flags / thresholds ───────────────────────────────────────────────

function envBool(name: string, defaultValue: boolean): boolean {
  const v = process.env[name]?.trim().toLowerCase()
  if (!v) return defaultValue
  return v === "true" || v === "1" || v === "yes"
}

function envNum(name: string, defaultValue: number): number {
  const raw = process.env[name]?.trim()
  if (!raw) return defaultValue
  const n = Number(raw)
  return Number.isFinite(n) ? n : defaultValue
}

export function isPortfolioOptimizerEnabled(): boolean {
  return envBool("PORTFOLIO_OPTIMIZER_ENABLED", true)
}

export const PORTFOLIO_OPTIMIZER_THRESHOLDS = {
  /** Cap on Kelly fraction applied to NAV for new trades. */
  kellyFractionCap: () => Math.min(1, Math.max(0.01, envNum("KELLY_FRACTION_CAP", 0.25))),
  /** When win-rate history is missing — conservative fraction of the cap. */
  kellyNoDataFractionOfCap: 0.2,
  /** Max |corr| vs any open position; above → block new trade. */
  maxCorrelation: 0.8,
  /** Day drop on SPY (or proxy) that triggers defensive size cut. */
  marketDropPct: -2,
  /** VIX above this → defensive-only universe. */
  defensiveVixThreshold: () => envNum("DEFENSIVE_VIX_THRESHOLD", 30),
  /** Target short-term / long-term capital split. */
  shortTermWeight: 0.7,
  longTermWeight: 0.3,
  /** Defensive size multiplier when market drop >2%. */
  defensiveSizeFactor: 0.5,
  /** Minimum closed trades before Kelly uses real win-rate. */
  minTradesForKelly: 5,
  /** Soft weekly rebalance cadence (days). */
  rebalanceIntervalDays: 7,
} as const

export const DEFENSIVE_TICKERS = ["GLD", "TLT", "VXX"] as const

const OPTIMIZER_STATE_FILE = path.resolve(process.cwd(), ".forgeos/portfolio-optimizer-state.json")
const PAPER_STATE_CANDIDATES = [
  path.resolve(process.cwd(), ".forgeos/registry/paper-trading-state.json"),
  ...(process.env.PAPER_TRADING_STORE_PATH?.trim()
    ? [path.resolve(process.cwd(), process.env.PAPER_TRADING_STORE_PATH.trim())]
    : []),
]

// ── Types ────────────────────────────────────────────────────────────────────

export type PortfolioMode = "NORMAL" | "DEFENSIVE"

export type PortfolioActionKind =
  | "SIZE_CAP"
  | "BLOCK_NEW_TRADE"
  | "DEFENSIVE_UNIVERSE"
  | "REDUCE_RECOMMENDATION"
  | "REBALANCE_SUGGESTION"
  | "TELEGRAM_NOTIFY"
  | "BENCHMARK_NOTE"

export type PortfolioAction = {
  readonly kind: PortfolioActionKind
  readonly detail: string
  /** When true, action is advisory only — no unsupervised live orders. */
  readonly recommendationOnly: boolean
}

export type PortfolioPolicyContext = {
  readonly proposedTicker?: string
  readonly direction?: "BUY" | "SELL"
  readonly existingSymbols?: readonly string[]
  readonly monitoredPositions?: readonly MonitoredPosition[]
  readonly navUSD?: number
  readonly portfolioReturnPct?: number | null
  /** Skip Telegram (e.g. unit tests / dry eval). */
  readonly suppressTelegram?: boolean
}

export type PortfolioPolicyResult = {
  readonly mode: PortfolioMode
  readonly kellyFraction: number
  readonly kellySource: "HISTORICAL" | "NO_DATA"
  readonly allowNewTrade: boolean
  /** Cap as fraction of NAV for new positions (after Kelly + defensive). */
  readonly maxPositionPct: number
  readonly reasons: string[]
  readonly actions: PortfolioAction[]
  readonly correlation?: {
    readonly maxAbsCorr: number | null
    readonly vsSymbol: string | null
    readonly status: "PASS" | "FAIL" | "SKIP" | "NO_DATA"
  }
  readonly benchmark?: BenchmarkComparison
  readonly rebalance?: WeeklyRebalanceSuggestion | null
  readonly evaluatedAt: string
}

export type KellyInput = {
  readonly winRate: number | null
  readonly avgWin: number | null
  readonly avgLoss: number | null
  readonly tradeCount: number
  readonly source: "HISTORICAL" | "NO_DATA"
}

export type KellySizeResult = {
  readonly fraction: number
  readonly rawKelly: number | null
  readonly capped: boolean
  readonly source: "HISTORICAL" | "NO_DATA"
  readonly reason: string
}

export type CorrelationCheckResult = {
  readonly maxAbsCorr: number | null
  readonly vsSymbol: string | null
  readonly status: "PASS" | "FAIL" | "SKIP" | "NO_DATA"
  readonly detail: string
}

export type BenchmarkComparison = {
  readonly status: "OK" | "NO_DATA"
  readonly spyChangePct: number | null
  readonly portfolioReturnPct: number | null
  readonly excessReturnPct: number | null
  readonly detail: string
  readonly asOf: string
}

export type WeeklyRebalanceSuggestion = {
  readonly due: boolean
  readonly lastRebalanceAt: string | null
  readonly shortTermTargetPct: number
  readonly longTermTargetPct: number
  readonly suggestions: string[]
  readonly recommendationOnly: true
}

export type ClosedTradeOutcome = {
  readonly ticker: string
  readonly pnlUSD: number
  readonly pnlPct: number
  readonly kind: "TP" | "SL" | "MANUAL" | "PAPER"
  readonly closedAt: string
}

export type PortfolioOptimizerPersistedState = {
  mode: PortfolioMode
  lastModeChangeAt: string | null
  lastRebalanceAt: string | null
  lastDefensiveNotifyAt: string | null
  lastMarketDropPct: number | null
  lastVix: number | null
  lastMaxPositionPct: number
  lastKellyFraction: number
  lastBenchmark?: BenchmarkComparison | null
  pendingRecommendations: PortfolioAction[]
  closedOutcomes: ClosedTradeOutcome[]
  updatedAt: string
}

const DEFAULT_OPTIMIZER_STATE: PortfolioOptimizerPersistedState = {
  mode: "NORMAL",
  lastModeChangeAt: null,
  lastRebalanceAt: null,
  lastDefensiveNotifyAt: null,
  lastMarketDropPct: null,
  lastVix: null,
  lastMaxPositionPct: TRADING_CONFIG.risk.maxPositionPct,
  lastKellyFraction: PORTFOLIO_OPTIMIZER_THRESHOLDS.kellyFractionCap() *
    PORTFOLIO_OPTIMIZER_THRESHOLDS.kellyNoDataFractionOfCap,
  lastBenchmark: null,
  pendingRecommendations: [],
  closedOutcomes: [],
  updatedAt: new Date(0).toISOString(),
}

// ── Persistence ──────────────────────────────────────────────────────────────

export function loadOptimizerState(): PortfolioOptimizerPersistedState {
  try {
    if (!fs.existsSync(OPTIMIZER_STATE_FILE)) return structuredClone(DEFAULT_OPTIMIZER_STATE)
    const raw = fs.readFileSync(OPTIMIZER_STATE_FILE, "utf8").replace(/^\uFEFF/, "")
    if (!raw.trim()) return structuredClone(DEFAULT_OPTIMIZER_STATE)
    const parsed = JSON.parse(raw) as Partial<PortfolioOptimizerPersistedState>
    return {
      mode: parsed.mode === "DEFENSIVE" ? "DEFENSIVE" : "NORMAL",
      lastModeChangeAt: typeof parsed.lastModeChangeAt === "string" ? parsed.lastModeChangeAt : null,
      lastRebalanceAt: typeof parsed.lastRebalanceAt === "string" ? parsed.lastRebalanceAt : null,
      lastDefensiveNotifyAt:
        typeof parsed.lastDefensiveNotifyAt === "string" ? parsed.lastDefensiveNotifyAt : null,
      lastMarketDropPct:
        typeof parsed.lastMarketDropPct === "number" ? parsed.lastMarketDropPct : null,
      lastVix: typeof parsed.lastVix === "number" ? parsed.lastVix : null,
      lastMaxPositionPct:
        typeof parsed.lastMaxPositionPct === "number"
          ? parsed.lastMaxPositionPct
          : TRADING_CONFIG.risk.maxPositionPct,
      lastKellyFraction:
        typeof parsed.lastKellyFraction === "number"
          ? parsed.lastKellyFraction
          : DEFAULT_OPTIMIZER_STATE.lastKellyFraction,
      lastBenchmark: parsed.lastBenchmark ?? null,
      pendingRecommendations: Array.isArray(parsed.pendingRecommendations)
        ? parsed.pendingRecommendations
        : [],
      closedOutcomes: Array.isArray(parsed.closedOutcomes) ? parsed.closedOutcomes : [],
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : new Date().toISOString(),
    }
  } catch {
    return structuredClone(DEFAULT_OPTIMIZER_STATE)
  }
}

export function saveOptimizerState(state: PortfolioOptimizerPersistedState): void {
  const dir = path.dirname(OPTIMIZER_STATE_FILE)
  fs.mkdirSync(dir, { recursive: true })
  const tmp = `${OPTIMIZER_STATE_FILE}.tmp`
  const next = { ...state, updatedAt: new Date().toISOString() }
  fs.writeFileSync(tmp, JSON.stringify(next, null, 2), "utf8")
  fs.renameSync(tmp, OPTIMIZER_STATE_FILE)
}

function updateOptimizerState(
  mutator: (state: PortfolioOptimizerPersistedState) => PortfolioOptimizerPersistedState,
): PortfolioOptimizerPersistedState {
  const next = mutator(loadOptimizerState())
  saveOptimizerState(next)
  return next
}

/** Record a real closed-trade outcome for Kelly (never invent). */
export function recordClosedTradeOutcome(outcome: ClosedTradeOutcome): void {
  updateOptimizerState((state) => ({
    ...state,
    closedOutcomes: [outcome, ...state.closedOutcomes].slice(0, 500),
  }))
}

/**
 * Sync caps last applied by evaluatePortfolioPolicy — used by RiskManager
 * without re-fetching market data on every checkOrder.
 */
export function getPersistedSizingCaps(): {
  enabled: boolean
  mode: PortfolioMode
  maxPositionPct: number
  kellyFraction: number
  defensiveUniverseOnly: boolean
} {
  if (!isPortfolioOptimizerEnabled()) {
    return {
      enabled: false,
      mode: "NORMAL",
      maxPositionPct: TRADING_CONFIG.risk.maxPositionPct,
      kellyFraction: TRADING_CONFIG.risk.maxPositionPct,
      defensiveUniverseOnly: false,
    }
  }
  const s = loadOptimizerState()
  return {
    enabled: true,
    mode: s.mode,
    maxPositionPct: Math.min(TRADING_CONFIG.risk.maxPositionPct, s.lastMaxPositionPct),
    kellyFraction: s.lastKellyFraction,
    defensiveUniverseOnly: s.mode === "DEFENSIVE" && (s.lastVix ?? 0) >= PORTFOLIO_OPTIMIZER_THRESHOLDS.defensiveVixThreshold(),
  }
}

// ── Math helpers (same pattern as smart-execution correlation) ───────────────

function pearson(a: number[], b: number[]): number | null {
  const n = Math.min(a.length, b.length)
  if (n < 5) return null
  const ax = a.slice(-n)
  const bx = b.slice(-n)
  let sumA = 0
  let sumB = 0
  for (let i = 0; i < n; i += 1) {
    sumA += ax[i]!
    sumB += bx[i]!
  }
  const meanA = sumA / n
  const meanB = sumB / n
  let num = 0
  let denA = 0
  let denB = 0
  for (let i = 0; i < n; i += 1) {
    const da = ax[i]! - meanA
    const db = bx[i]! - meanB
    num += da * db
    denA += da * da
    denB += db * db
  }
  const den = Math.sqrt(denA * denB)
  if (!(den > 0)) return null
  return num / den
}

function closesToReturns(closes: readonly number[]): number[] {
  const out: number[] = []
  for (let i = 1; i < closes.length; i += 1) {
    const prev = closes[i - 1]!
    const cur = closes[i]!
    if (prev > 0 && Number.isFinite(cur)) out.push((cur - prev) / prev)
  }
  return out
}

// ── Kelly ────────────────────────────────────────────────────────────────────

function loadPaperClosedPnls(): number[] {
  for (const file of PAPER_STATE_CANDIDATES) {
    try {
      if (!file || !fs.existsSync(file)) continue
      const raw = fs.readFileSync(file, "utf8").replace(/^\uFEFF/, "")
      if (!raw.trim()) continue
      const parsed = JSON.parse(raw) as { closedTrades?: unknown[] }
      if (!Array.isArray(parsed.closedTrades)) continue
      const pnls: number[] = []
      for (const t of parsed.closedTrades) {
        if (!t || typeof t !== "object") continue
        const pnl = Number((t as { pnl?: unknown }).pnl)
        if (Number.isFinite(pnl)) pnls.push(pnl)
      }
      if (pnls.length > 0) return pnls
    } catch {
      /* try next */
    }
  }
  return []
}

/** Gather win/loss stats from optimizer outcomes + optional paper ledger. Never invent. */
export function gatherKellyInput(): KellyInput {
  const outcomes = loadOptimizerState().closedOutcomes
  const pnls: number[] = outcomes
    .map((o) => o.pnlUSD)
    .filter((n) => Number.isFinite(n))

  if (pnls.length < PORTFOLIO_OPTIMIZER_THRESHOLDS.minTradesForKelly) {
    const paper = loadPaperClosedPnls()
    for (const p of paper) pnls.push(p)
  }

  if (pnls.length < PORTFOLIO_OPTIMIZER_THRESHOLDS.minTradesForKelly) {
    return {
      winRate: null,
      avgWin: null,
      avgLoss: null,
      tradeCount: pnls.length,
      source: "NO_DATA",
    }
  }

  const wins = pnls.filter((p) => p > 0)
  const losses = pnls.filter((p) => p < 0)
  const winRate = wins.length / pnls.length
  const avgWin = wins.length > 0 ? wins.reduce((a, b) => a + b, 0) / wins.length : null
  const avgLoss =
    losses.length > 0 ? Math.abs(losses.reduce((a, b) => a + b, 0) / losses.length) : null

  return {
    winRate,
    avgWin,
    avgLoss,
    tradeCount: pnls.length,
    source: "HISTORICAL",
  }
}

/**
 * Kelly fraction f* = W − (1−W)/R where R = avgWin/avgLoss.
 * Caps at KELLY_FRACTION_CAP. NO_DATA → conservative fraction of cap.
 */
export function computeKellySize(input?: Partial<KellyInput>): KellySizeResult {
  const cap = PORTFOLIO_OPTIMIZER_THRESHOLDS.kellyFractionCap()
  const full = {
    ...gatherKellyInput(),
    ...input,
  }

  if (
    full.source === "NO_DATA" ||
    full.winRate == null ||
    !Number.isFinite(full.winRate) ||
    full.tradeCount < PORTFOLIO_OPTIMIZER_THRESHOLDS.minTradesForKelly
  ) {
    const fraction = cap * PORTFOLIO_OPTIMIZER_THRESHOLDS.kellyNoDataFractionOfCap
    return {
      fraction,
      rawKelly: null,
      capped: true,
      source: "NO_DATA",
      reason: `NO_DATA Kelly — only ${full.tradeCount} closed trades (need ${PORTFOLIO_OPTIMIZER_THRESHOLDS.minTradesForKelly}); using conservative ${(fraction * 100).toFixed(1)}% of NAV`,
    }
  }

  const W = Math.min(1, Math.max(0, full.winRate))
  const avgWin = full.avgWin != null && full.avgWin > 0 ? full.avgWin : null
  const avgLoss = full.avgLoss != null && full.avgLoss > 0 ? full.avgLoss : null

  let rawKelly: number | null = null
  if (avgWin != null && avgLoss != null && avgLoss > 0) {
    const R = avgWin / avgLoss
    rawKelly = W - (1 - W) / R
  } else if (W > 0) {
    // Incomplete payoff ratio — half-Kelly on win rate only is still invented payoff;
    // use conservative: kelly = 2W - 1 when R≈1, else NO_DATA path.
    rawKelly = 2 * W - 1
  }

  if (rawKelly == null || !Number.isFinite(rawKelly) || rawKelly <= 0) {
    const fraction = cap * PORTFOLIO_OPTIMIZER_THRESHOLDS.kellyNoDataFractionOfCap
    return {
      fraction,
      rawKelly: rawKelly != null && Number.isFinite(rawKelly) ? rawKelly : null,
      capped: true,
      source: "HISTORICAL",
      reason: `Kelly non-positive from ${full.tradeCount} trades (W=${(W * 100).toFixed(0)}%) — conservative ${(fraction * 100).toFixed(1)}%`,
    }
  }

  const fraction = Math.min(cap, rawKelly)
  return {
    fraction,
    rawKelly,
    capped: fraction < rawKelly,
    source: "HISTORICAL",
    reason: `Kelly ${(rawKelly * 100).toFixed(1)}% from ${full.tradeCount} trades (W=${(W * 100).toFixed(0)}%)${fraction < rawKelly ? ` capped at ${(cap * 100).toFixed(0)}%` : ""}`,
  }
}

// ── Correlation ──────────────────────────────────────────────────────────────

export async function checkPositionCorrelation(
  ticker: string,
  existingSymbols?: readonly string[],
): Promise<CorrelationCheckResult> {
  const threshold = PORTFOLIO_OPTIMIZER_THRESHOLDS.maxCorrelation
  let symbols = existingSymbols ? [...existingSymbols] : []
  if (symbols.length === 0) {
    try {
      symbols = await fetchTradingOpenSymbols()
    } catch {
      symbols = loadTradingState().monitoredPositions.map((p) => p.ticker)
    }
  }

  const others = symbols
    .map((s) => s.toUpperCase())
    .filter((s) => s && s !== ticker.toUpperCase())

  if (others.length === 0) {
    return {
      maxAbsCorr: null,
      vsSymbol: null,
      status: "SKIP",
      detail: "No other open positions — correlation skipped",
    }
  }

  try {
    const focusBars = await getDailyBars(ticker, "3mo")
    const focusRets = closesToReturns(focusBars.map((b) => b.close))
    if (focusRets.length < 5) {
      return {
        maxAbsCorr: null,
        vsSymbol: null,
        status: "NO_DATA",
        detail: "Insufficient price history for correlation — no invent",
      }
    }

    let maxAbsCorr: number | null = null
    let maxPair = ""
    for (const sym of others.slice(0, 8)) {
      const bars = await getDailyBars(sym, "3mo")
      const rets = closesToReturns(bars.map((b) => b.close))
      const corr = pearson(focusRets, rets)
      if (corr == null) continue
      if (maxAbsCorr == null || Math.abs(corr) > Math.abs(maxAbsCorr)) {
        maxAbsCorr = corr
        maxPair = sym
      }
    }

    if (maxAbsCorr == null) {
      return {
        maxAbsCorr: null,
        vsSymbol: null,
        status: "NO_DATA",
        detail: "Could not compute pairwise returns correlation",
      }
    }

    const pass = Math.abs(maxAbsCorr) < threshold
    return {
      maxAbsCorr,
      vsSymbol: maxPair,
      status: pass ? "PASS" : "FAIL",
      detail: pass
        ? `Max |corr| vs ${maxPair}: ${maxAbsCorr.toFixed(3)} < ${threshold}`
        : `Max |corr| vs ${maxPair}: ${maxAbsCorr.toFixed(3)} ≥ ${threshold} — block new position`,
    }
  } catch (err) {
    return {
      maxAbsCorr: null,
      vsSymbol: null,
      status: "NO_DATA",
      detail: `Correlation error: ${err instanceof Error ? err.message : "error"}`,
    }
  }
}

// ── Benchmark (SPY) ──────────────────────────────────────────────────────────

export async function getBenchmarkComparison(
  portfolioReturnPct?: number | null,
): Promise<BenchmarkComparison> {
  const asOf = new Date().toISOString()
  try {
    const quotes = await getBatchPrices(["SPY"])
    const spy = quotes.get("SPY")
    if (!spy || !Number.isFinite(spy.changePct)) {
      return {
        status: "NO_DATA",
        spyChangePct: null,
        portfolioReturnPct: portfolioReturnPct ?? null,
        excessReturnPct: null,
        detail: "SPY quote unavailable from Yahoo",
        asOf,
      }
    }

    const port =
      portfolioReturnPct != null && Number.isFinite(portfolioReturnPct)
        ? portfolioReturnPct
        : null
    const excess = port != null ? port - spy.changePct : null

    return {
      status: "OK",
      spyChangePct: spy.changePct,
      portfolioReturnPct: port,
      excessReturnPct: excess,
      detail:
        port != null
          ? `Portfolio ${port >= 0 ? "+" : ""}${port.toFixed(2)}% vs SPY ${spy.changePct >= 0 ? "+" : ""}${spy.changePct.toFixed(2)}% (excess ${excess! >= 0 ? "+" : ""}${excess!.toFixed(2)}%)`
          : `SPY day ${spy.changePct >= 0 ? "+" : ""}${spy.changePct.toFixed(2)}% — portfolio return NO_DATA (not invented)`,
      asOf,
    }
  } catch (err) {
    return {
      status: "NO_DATA",
      spyChangePct: null,
      portfolioReturnPct: portfolioReturnPct ?? null,
      excessReturnPct: null,
      detail: `Benchmark failed: ${err instanceof Error ? err.message : "error"}`,
      asOf,
    }
  }
}

// ── Horizon split + weekly rebalance (soft) ──────────────────────────────────

function classifyHorizon(pos: MonitoredPosition): "short" | "long" {
  const hoursOpen = (Date.now() - new Date(pos.openedAt).getTime()) / 3_600_000
  // Positions held >5 trading days (~120h) treated as long-term sleeve
  return hoursOpen >= 120 ? "long" : "short"
}

export function buildWeeklyRebalanceSuggestion(
  positions: readonly MonitoredPosition[],
  lastRebalanceAt: string | null,
  now = new Date(),
): WeeklyRebalanceSuggestion {
  const intervalMs = PORTFOLIO_OPTIMIZER_THRESHOLDS.rebalanceIntervalDays * 86_400_000
  const lastMs = lastRebalanceAt ? Date.parse(lastRebalanceAt) : 0
  const due = !lastRebalanceAt || !Number.isFinite(lastMs) || now.getTime() - lastMs >= intervalMs

  const suggestions: string[] = []
  if (positions.length === 0) {
    suggestions.push("No open monitored positions — nothing to rebalance")
  } else {
    let shortNotional = 0
    let longNotional = 0
    for (const p of positions) {
      const notional = Math.abs(p.shares * p.entryPrice)
      if (classifyHorizon(p) === "long") longNotional += notional
      else shortNotional += notional
    }
    const total = shortNotional + longNotional
    if (total > 0) {
      const shortPct = shortNotional / total
      const longPct = longNotional / total
      const targetS = PORTFOLIO_OPTIMIZER_THRESHOLDS.shortTermWeight
      const targetL = PORTFOLIO_OPTIMIZER_THRESHOLDS.longTermWeight
      suggestions.push(
        `Current sleeve mix: short ${(shortPct * 100).toFixed(0)}% / long ${(longPct * 100).toFixed(0)}% (target 70/30)`,
      )
      if (Math.abs(shortPct - targetS) > 0.1) {
        suggestions.push(
          `Suggest trimming ${shortPct > targetS ? "short-term" : "long-term"} sleeve toward ${(targetS * 100).toFixed(0)}%/${(targetL * 100).toFixed(0)}% — recommendation only`,
        )
      }
      // Performance tilt: prefer symbols with unrealized edge via entry vs stop distance (proxy, not invented PnL)
      const ranked = [...positions].sort((a, b) => {
        const edgeA = (a.takeProfit - a.entryPrice) / Math.max(a.entryPrice - a.stopLoss, 1e-9)
        const edgeB = (b.takeProfit - b.entryPrice) / Math.max(b.entryPrice - b.stopLoss, 1e-9)
        return edgeB - edgeA
      })
      if (ranked[0]) {
        suggestions.push(
          `Weight tilt hint (RR proxy, not live PnL): favor ${ranked[0].ticker} over weaker RR names on next supervised rebalance`,
        )
      }
    }
  }

  return {
    due,
    lastRebalanceAt,
    shortTermTargetPct: PORTFOLIO_OPTIMIZER_THRESHOLDS.shortTermWeight * 100,
    longTermTargetPct: PORTFOLIO_OPTIMIZER_THRESHOLDS.longTermWeight * 100,
    suggestions,
    recommendationOnly: true,
  }
}

export function markRebalanceSuggested(): void {
  updateOptimizerState((s) => ({
    ...s,
    lastRebalanceAt: new Date().toISOString(),
  }))
}

// ── Policy evaluation ────────────────────────────────────────────────────────

async function fetchSpyDayChange(): Promise<number | null> {
  try {
    const quotes = await getBatchPrices(["SPY"])
    const spy = quotes.get("SPY")
    return spy && Number.isFinite(spy.changePct) ? spy.changePct : null
  } catch {
    return null
  }
}

/**
 * Main policy gate consumed by TradingEngine / RiskManager.
 * Safe by default: recommendations + size caps only.
 */
export async function evaluatePortfolioPolicy(
  ctx: PortfolioPolicyContext = {},
): Promise<PortfolioPolicyResult> {
  const evaluatedAt = new Date().toISOString()
  const reasons: string[] = []
  const actions: PortfolioAction[] = []

  if (!isPortfolioOptimizerEnabled()) {
    return {
      mode: "NORMAL",
      kellyFraction: TRADING_CONFIG.risk.maxPositionPct,
      kellySource: "NO_DATA",
      allowNewTrade: true,
      maxPositionPct: TRADING_CONFIG.risk.maxPositionPct,
      reasons: ["Portfolio optimizer disabled (PORTFOLIO_OPTIMIZER_ENABLED=false)"],
      actions: [],
      evaluatedAt,
    }
  }

  const kelly = computeKellySize()
  reasons.push(kelly.reason)

  let mode: PortfolioMode = "NORMAL"
  let maxPositionPct = Math.min(TRADING_CONFIG.risk.maxPositionPct, kelly.fraction)
  let allowNewTrade = true

  actions.push({
    kind: "SIZE_CAP",
    detail: `Kelly/size cap ${(maxPositionPct * 100).toFixed(2)}% NAV`,
    recommendationOnly: false,
  })

  // Market drop + VIX
  const [spyChange, macro] = await Promise.all([
    fetchSpyDayChange(),
    getMacroContext().catch(() => null),
  ])
  const vix = macro?.vix.price != null && Number.isFinite(macro.vix.price) ? macro.vix.price : null
  const vixThreshold = PORTFOLIO_OPTIMIZER_THRESHOLDS.defensiveVixThreshold()

  if (spyChange != null && spyChange <= PORTFOLIO_OPTIMIZER_THRESHOLDS.marketDropPct) {
    mode = "DEFENSIVE"
    maxPositionPct *= PORTFOLIO_OPTIMIZER_THRESHOLDS.defensiveSizeFactor
    reasons.push(
      `SPY day ${spyChange.toFixed(2)}% ≤ ${PORTFOLIO_OPTIMIZER_THRESHOLDS.marketDropPct}% — defensive size ×${PORTFOLIO_OPTIMIZER_THRESHOLDS.defensiveSizeFactor}`,
    )
    actions.push({
      kind: "REDUCE_RECOMMENDATION",
      detail: `Recommend reducing open risk to ~50% (SPY ${spyChange.toFixed(2)}%). No unsupervised live reduce — store plan for approval.`,
      recommendationOnly: true,
    })
    actions.push({
      kind: "SIZE_CAP",
      detail: `New-trade maxPositionPct → ${(maxPositionPct * 100).toFixed(2)}% after market-drop cut`,
      recommendationOnly: false,
    })
  } else if (spyChange == null) {
    reasons.push("SPY day change NO_DATA — skip market-drop defensive trigger")
  }

  if (vix != null && vix > vixThreshold) {
    mode = "DEFENSIVE"
    reasons.push(`VIX ${vix.toFixed(1)} > ${vixThreshold} — defensive universe only (${DEFENSIVE_TICKERS.join(", ")})`)
    actions.push({
      kind: "DEFENSIVE_UNIVERSE",
      detail: `Only allow new trades in ${DEFENSIVE_TICKERS.join(", ")}`,
      recommendationOnly: false,
    })
    actions.push({
      kind: "REDUCE_RECOMMENDATION",
      detail: "Recommend rotating non-defensive exposure toward GLD/TLT/VXX — Telegram plan only; no auto live closes",
      recommendationOnly: true,
    })

    const proposed = ctx.proposedTicker?.toUpperCase()
    if (
      proposed &&
      ctx.direction === "BUY" &&
      !(DEFENSIVE_TICKERS as readonly string[]).includes(proposed)
    ) {
      allowNewTrade = false
      reasons.push(`${proposed} blocked — not in defensive universe while VIX > ${vixThreshold}`)
      actions.push({
        kind: "BLOCK_NEW_TRADE",
        detail: `${proposed} not in ${DEFENSIVE_TICKERS.join("/")}`,
        recommendationOnly: false,
      })
    }
  } else if (vix == null) {
    reasons.push("VIX NO_DATA — skip VIX defensive universe trigger")
  }

  // Correlation gate for proposed ticker
  let correlation: PortfolioPolicyResult["correlation"]
  if (ctx.proposedTicker && ctx.direction === "BUY") {
    const corr = await checkPositionCorrelation(ctx.proposedTicker, ctx.existingSymbols)
    correlation = {
      maxAbsCorr: corr.maxAbsCorr,
      vsSymbol: corr.vsSymbol,
      status: corr.status,
    }
    reasons.push(corr.detail)
    if (corr.status === "FAIL") {
      allowNewTrade = false
      actions.push({
        kind: "BLOCK_NEW_TRADE",
        detail: corr.detail,
        recommendationOnly: false,
      })
    }
  }

  const positions = ctx.monitoredPositions ?? loadTradingState().monitoredPositions
  const prev = loadOptimizerState()
  const rebalance = buildWeeklyRebalanceSuggestion(positions, prev.lastRebalanceAt)
  if (rebalance.due) {
    actions.push({
      kind: "REBALANCE_SUGGESTION",
      detail: rebalance.suggestions.join(" | ") || "Weekly rebalance window open (soft)",
      recommendationOnly: true,
    })
    reasons.push("Weekly rebalance suggestion due (not auto-executed)")
  }

  const benchmark = await getBenchmarkComparison(ctx.portfolioReturnPct ?? null)
  reasons.push(benchmark.detail)
  actions.push({
    kind: "BENCHMARK_NOTE",
    detail: benchmark.detail,
    recommendationOnly: true,
  })

  // Persist mode + caps + recommendations
  const modeChanged = prev.mode !== mode
  updateOptimizerState((s) => ({
    ...s,
    mode,
    lastModeChangeAt: modeChanged ? evaluatedAt : s.lastModeChangeAt,
    lastMarketDropPct: spyChange,
    lastVix: vix,
    lastMaxPositionPct: maxPositionPct,
    lastKellyFraction: kelly.fraction,
    lastBenchmark: benchmark,
    pendingRecommendations: actions.filter((a) => a.recommendationOnly).slice(0, 40),
    lastRebalanceAt: rebalance.due ? evaluatedAt : s.lastRebalanceAt,
  }))

  if (mode === "DEFENSIVE" && modeChanged && !ctx.suppressTelegram) {
    actions.push({
      kind: "TELEGRAM_NOTIFY",
      detail: "Notify Telegram of DEFENSIVE mode switch + recommended actions",
      recommendationOnly: true,
    })
    void notifyDefensiveMode({
      mode,
      reasons,
      actions: actions.filter((a) => a.recommendationOnly),
      maxPositionPct,
      spyChange,
      vix,
    }).catch(() => undefined)
  }

  return {
    mode,
    kellyFraction: kelly.fraction,
    kellySource: kelly.source,
    allowNewTrade,
    maxPositionPct,
    reasons,
    actions,
    correlation,
    benchmark,
    rebalance,
    evaluatedAt,
  }
}

async function notifyDefensiveMode(params: {
  mode: PortfolioMode
  reasons: string[]
  actions: PortfolioAction[]
  maxPositionPct: number
  spyChange: number | null
  vix: number | null
}): Promise<void> {
  const { notifyPortfolioDefensiveMode } = await import("@/lib/notifications/telegram-bot")
  await notifyPortfolioDefensiveMode({
    maxPositionPct: params.maxPositionPct,
    spyChangePct: params.spyChange,
    vix: params.vix,
    reasons: params.reasons.slice(0, 6),
    recommendations: params.actions.map((a) => a.detail).slice(0, 6),
  })
  updateOptimizerState((s) => ({
    ...s,
    lastDefensiveNotifyAt: new Date().toISOString(),
  }))
}
