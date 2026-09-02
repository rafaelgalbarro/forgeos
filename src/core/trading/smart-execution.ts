/**
 * Phase F — Smart execution scaffolding for ForgeOS Investment.
 *
 * - Pre-trade checklist gates PENDING_APPROVAL / placeOrder paths
 * - Smart order plans (BRACKET / OCO / TRAILING / VWAP_SLICE / ICEBERG)
 * - IBKR FastAPI currently accepts LMT proposals only — native brackets/OCO/iceberg
 *   are PLANNED; entry LMT + PositionMonitor SL/TP/trailing are the REAL path
 *
 * Does NOT enable unsupervised live trading. Safe with ANALYSIS_ONLY / paper defaults.
 */

import "server-only"

import { getDailyBars, getEarningsWithinHours, getBatchPrices } from "@/lib/market-data/yahoo-finance"
import type { MacroContext } from "@/lib/market-data/macro-context"
import { fetchTradingOpenSymbols } from "@/lib/trading/ibkr-data"

// ── Feature flags ───────────────────────────────────────────────────────────

function envBool(name: string, defaultValue: boolean): boolean {
  const v = process.env[name]?.trim().toLowerCase()
  if (!v) return defaultValue
  return v === "true" || v === "1" || v === "yes"
}

/** Planning + structured intents (default on). Does not unlock live unsupervised trading. */
export function isSmartExecutionEnabled(): boolean {
  return envBool("SMART_EXECUTION_ENABLED", true)
}

/** Pre-trade gate before enqueue / execute (default on). */
export function isPreTradeChecklistEnabled(): boolean {
  return envBool("PRETRADE_CHECKLIST_ENABLED", true)
}

/** When true, missing earnings calendar fails closed. Default: soft NO_DATA pass. */
export function failOnMissingEarnings(): boolean {
  return envBool("PRETRADE_FAIL_ON_MISSING_EARNINGS", false)
}

// ── Thresholds (spec) ───────────────────────────────────────────────────────

export const PRETRADE_THRESHOLDS = {
  maxSpreadPct: 0.5, // bid/ask < 0.5%
  maxSlippagePct: 0.3, // estimated impact
  macroHorizonHours: 2,
  earningsHorizonHours: 24,
  maxCorrelation: 0.7,
  atrTrailMultiple: 2,
  icebergDisplayPct: 0.2,
  vwapMinSlices: 3,
  vwapMaxSlices: 5,
} as const

// ── Checklist types ─────────────────────────────────────────────────────────

export type ChecklistItemStatus = "PASS" | "FAIL" | "SKIP" | "NO_DATA" | "WARN"

export type PreTradeCheckId = "spread" | "volume" | "macro" | "earnings" | "correlation"

export type PreTradeCheckItem = {
  readonly id: PreTradeCheckId
  readonly label: string
  readonly status: ChecklistItemStatus
  readonly detail: string
  readonly measured?: number | null
  readonly threshold?: number | null
}

export type PreTradeChecklistResult = {
  readonly passed: boolean
  readonly hold: boolean
  readonly reason: string
  readonly checks: readonly PreTradeCheckItem[]
  readonly ranAt: string
}

export type PreTradeChecklistContext = {
  readonly ticker: string
  readonly direction: "BUY" | "SELL"
  readonly currentPrice: number
  readonly bid: number
  readonly ask: number
  /** Session / day volume (shares). */
  readonly volume: number
  readonly orderShares: number
  readonly orderValueUSD: number
  /** Soft macro caution from MacroContext / institutional scanner. */
  readonly macro?: MacroContext | null
  readonly macroCaution24h?: boolean | null
  /** Existing open position symbols (if already known). */
  readonly existingSymbols?: readonly string[]
}

// ── Smart order plan types ──────────────────────────────────────────────────

export type SmartOrderKind = "BRACKET" | "OCO" | "TRAILING" | "VWAP_SLICE" | "ICEBERG"

/** REAL = broker/monitor path exists today; PLANNED = intent only until IBKR supports it. */
export type SmartFieldReality = "REAL" | "PLANNED"

export type SmartOrderSlice = {
  readonly index: number
  readonly quantity: number
  readonly displayQuantity?: number
  readonly limitPriceHint?: number
}

export type SmartOrderPlan = {
  readonly planId: string
  readonly ticker: string
  readonly direction: "BUY" | "SELL"
  readonly kinds: readonly SmartOrderKind[]
  readonly entry: {
    readonly quantity: number
    readonly limitPrice?: number
    readonly orderType: "LMT"
    readonly reality: SmartFieldReality
  }
  readonly bracket?: {
    readonly stopLoss: number
    readonly takeProfit: number
    /** Native IBKR bracket attach — not supported by FastAPI yet. */
    readonly ibkrNative: SmartFieldReality
    /** Client PositionMonitor SL/TP. */
    readonly monitor: SmartFieldReality
  }
  readonly oco?: {
    readonly note: string
    readonly reality: SmartFieldReality
  }
  readonly trailing?: {
    readonly atr: number | null
    readonly atrMultiple: number
    readonly trailDistance: number | null
    readonly initialStop: number
    readonly reality: SmartFieldReality
  }
  readonly vwap?: {
    readonly slices: readonly SmartOrderSlice[]
    readonly reality: SmartFieldReality
  }
  readonly iceberg?: {
    readonly totalQuantity: number
    readonly displayQuantity: number
    readonly displayPct: number
    readonly reality: SmartFieldReality
  }
  readonly brokerMapping: {
    readonly supportedNow: "LMT_PROPOSAL_ONLY"
    readonly realSubmitNote: string
    readonly plannedFields: readonly string[]
  }
  readonly builtAt: string
}

export type BuildSmartOrderPlanInput = {
  readonly ticker: string
  readonly direction: "BUY" | "SELL"
  readonly shares: number
  readonly currentPrice: number
  readonly limitPrice?: number
  readonly stopLoss: number
  readonly takeProfit: number
  /** ATR absolute price units from analysis when available. */
  readonly atr?: number | null
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function pearson(a: number[], b: number[]): number | null {
  const n = Math.min(a.length, b.length)
  if (n < 5) return null
  const xa = a.slice(0, n)
  const xb = b.slice(0, n)
  const ma = xa.reduce((s, v) => s + v, 0) / n
  const mb = xb.reduce((s, v) => s + v, 0) / n
  let num = 0
  let da = 0
  let db = 0
  for (let i = 0; i < n; i++) {
    const dx = xa[i]! - ma
    const dy = xb[i]! - mb
    num += dx * dy
    da += dx * dx
    db += dy * dy
  }
  if (da <= 0 || db <= 0) return null
  return num / Math.sqrt(da * db)
}

function closesToReturns(closes: readonly number[]): number[] {
  const out: number[] = []
  for (let i = 1; i < closes.length; i++) {
    const prev = closes[i - 1]!
    if (prev > 0) out.push((closes[i]! - prev) / prev)
  }
  return out
}

function splitQuantity(total: number, parts: number): number[] {
  if (parts <= 1) return [total]
  const base = Math.floor((total / parts) * 10_000) / 10_000
  const slices: number[] = []
  let allocated = 0
  for (let i = 0; i < parts - 1; i++) {
    slices.push(base)
    allocated += base
  }
  slices.push(Math.max(0, parseFloat((total - allocated).toFixed(4))))
  return slices.filter((q) => q > 0)
}

async function loadMacroEventsNextHours(hours: number): Promise<{
  status: ChecklistItemStatus
  detail: string
  eventCount: number
}> {
  try {
    const from = new Date().toISOString().slice(0, 10)
    const url = `https://www.econdb.com/api/events/?format=json&date_from=${from}`
    const res = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
      headers: { Accept: "application/json", "User-Agent": "ForgeOS-PreTradeChecklist" },
    })
    if (!res.ok) {
      return { status: "NO_DATA", detail: `Macro calendar HTTP ${res.status}`, eventCount: 0 }
    }
    const data = (await res.json()) as Array<{ event?: string; title?: string; date?: string }>
    const now = Date.now()
    const until = now + hours * 3_600_000
    const keywords = /FOMC|CPI|NFP|nonfarm|payroll|powell|fed\s|interest rate|GDP|PCE|jobs report/i
    const hits: string[] = []
    for (const ev of data ?? []) {
      const label = `${ev.event ?? ""} ${ev.title ?? ""}`.trim()
      if (!label || !keywords.test(label)) continue
      const when = ev.date ? new Date(ev.date).getTime() : NaN
      if (!Number.isFinite(when)) continue
      if (when >= now && when <= until) hits.push(label.slice(0, 80))
    }
    if (hits.length > 0) {
      return {
        status: "FAIL",
        detail: `Macro event within ${hours}h: ${hits[0]}${hits.length > 1 ? ` (+${hits.length - 1})` : ""}`,
        eventCount: hits.length,
      }
    }
    return { status: "PASS", detail: `No high-impact macro events in next ${hours}h`, eventCount: 0 }
  } catch (err) {
    return {
      status: "NO_DATA",
      detail: `Macro calendar unavailable: ${err instanceof Error ? err.message : "error"}`,
      eventCount: 0,
    }
  }
}

// ── Pre-trade checklist ─────────────────────────────────────────────────────

export async function runPreTradeChecklist(
  ctx: PreTradeChecklistContext,
): Promise<PreTradeChecklistResult> {
  const ranAt = new Date().toISOString()
  const checks: PreTradeCheckItem[] = []
  const mid = ctx.currentPrice > 0 ? ctx.currentPrice : (ctx.bid + ctx.ask) / 2

  // 1. Spread bid/ask < 0.5%
  if (mid > 0 && ctx.bid > 0 && ctx.ask > 0 && ctx.ask >= ctx.bid) {
    const spreadPct = ((ctx.ask - ctx.bid) / mid) * 100
    const pass = spreadPct < PRETRADE_THRESHOLDS.maxSpreadPct
    checks.push({
      id: "spread",
      label: "Spread bid/ask",
      status: pass ? "PASS" : "FAIL",
      detail: pass
        ? `Spread ${spreadPct.toFixed(3)}% < ${PRETRADE_THRESHOLDS.maxSpreadPct}%`
        : `Spread ${spreadPct.toFixed(3)}% ≥ ${PRETRADE_THRESHOLDS.maxSpreadPct}%`,
      measured: spreadPct,
      threshold: PRETRADE_THRESHOLDS.maxSpreadPct,
    })
  } else {
    // IBKR history path often sets bid=ask=last — treat as NO_DATA soft pass with warn
    checks.push({
      id: "spread",
      label: "Spread bid/ask",
      status: "WARN",
      detail: "Bid/ask not distinguishable from last — spread check soft-passed (NO_DATA quote book)",
      measured: null,
      threshold: PRETRADE_THRESHOLDS.maxSpreadPct,
    })
  }

  // 2. Volume / slippage proxy
  let adv = ctx.volume
  try {
    const quotes = await getBatchPrices([ctx.ticker])
    const q = quotes.get(ctx.ticker.toUpperCase())
    if (q?.avgVolume && q.avgVolume > adv) adv = q.avgVolume
  } catch {
    /* keep session volume */
  }
  if (adv > 0 && ctx.orderShares > 0) {
    // Linear impact proxy: share of ADV ≈ estimated slippage %
    const estSlippagePct = (ctx.orderShares / adv) * 100
    const pass = estSlippagePct <= PRETRADE_THRESHOLDS.maxSlippagePct
    checks.push({
      id: "volume",
      label: "Volume / slippage",
      status: pass ? "PASS" : "FAIL",
      detail: pass
        ? `Est. impact ${estSlippagePct.toFixed(3)}% ≤ ${PRETRADE_THRESHOLDS.maxSlippagePct}% (ADV≈${Math.round(adv).toLocaleString()})`
        : `Est. impact ${estSlippagePct.toFixed(3)}% > ${PRETRADE_THRESHOLDS.maxSlippagePct}% — order may move the market`,
      measured: estSlippagePct,
      threshold: PRETRADE_THRESHOLDS.maxSlippagePct,
    })
  } else {
    checks.push({
      id: "volume",
      label: "Volume / slippage",
      status: "WARN",
      detail: "Volume unavailable — slippage check soft-passed",
      measured: null,
      threshold: PRETRADE_THRESHOLDS.maxSlippagePct,
    })
  }

  // 3. Macro events next 2h (+ soft institutional/macro caution)
  const macroEv = await loadMacroEventsNextHours(PRETRADE_THRESHOLDS.macroHorizonHours)
  if (macroEv.status === "FAIL") {
    checks.push({
      id: "macro",
      label: "Macro events (2h)",
      status: "FAIL",
      detail: macroEv.detail,
      measured: macroEv.eventCount,
      threshold: 0,
    })
  } else if (macroEv.status === "NO_DATA") {
    // Soft caution from already-fetched context — warn only, do not fail closed
    if (ctx.macroCaution24h || ctx.macro?.riskOff) {
      checks.push({
        id: "macro",
        label: "Macro events (2h)",
        status: "WARN",
        detail: `${macroEv.detail}; soft caution: ${ctx.macroCaution24h ? "macroCaution24h" : ""}${ctx.macro?.riskOff ? " riskOff" : ""}`.trim(),
        measured: null,
        threshold: 0,
      })
    } else {
      checks.push({
        id: "macro",
        label: "Macro events (2h)",
        status: "NO_DATA",
        detail: macroEv.detail,
        measured: null,
        threshold: 0,
      })
    }
  } else {
    const soft =
      ctx.macroCaution24h || ctx.macro?.riskOff
        ? ` (soft note: ${ctx.macroCaution24h ? "24h macro caution" : "riskOff bias"})`
        : ""
    checks.push({
      id: "macro",
      label: "Macro events (2h)",
      status: soft ? "WARN" : "PASS",
      detail: `${macroEv.detail}${soft}`,
      measured: 0,
      threshold: 0,
    })
  }

  // 4. Earnings next 24h
  try {
    const earnings = await getEarningsWithinHours(
      ctx.ticker,
      PRETRADE_THRESHOLDS.earningsHorizonHours,
    )
    if (earnings.status === "HAS_EVENT") {
      checks.push({
        id: "earnings",
        label: "Earnings (24h)",
        status: "FAIL",
        detail: `Earnings within 24h: ${earnings.detail}`,
        measured: earnings.hoursUntil,
        threshold: PRETRADE_THRESHOLDS.earningsHorizonHours,
      })
    } else if (earnings.status === "NO_DATA") {
      checks.push({
        id: "earnings",
        label: "Earnings (24h)",
        status: failOnMissingEarnings() ? "FAIL" : "NO_DATA",
        detail: earnings.detail,
        measured: null,
        threshold: PRETRADE_THRESHOLDS.earningsHorizonHours,
      })
    } else {
      checks.push({
        id: "earnings",
        label: "Earnings (24h)",
        status: "PASS",
        detail: earnings.detail,
        measured: earnings.hoursUntil,
        threshold: PRETRADE_THRESHOLDS.earningsHorizonHours,
      })
    }
  } catch (err) {
    checks.push({
      id: "earnings",
      label: "Earnings (24h)",
      status: failOnMissingEarnings() ? "FAIL" : "NO_DATA",
      detail: `Earnings lookup failed: ${err instanceof Error ? err.message : "error"}`,
      measured: null,
      threshold: PRETRADE_THRESHOLDS.earningsHorizonHours,
    })
  }

  // 5. Correlation with existing positions
  let symbols = ctx.existingSymbols ? [...ctx.existingSymbols] : []
  if (symbols.length === 0) {
    try {
      symbols = await fetchTradingOpenSymbols()
    } catch {
      symbols = []
    }
  }
  const others = symbols
    .map((s) => s.toUpperCase())
    .filter((s) => s !== ctx.ticker.toUpperCase())

  if (others.length === 0) {
    checks.push({
      id: "correlation",
      label: "Position correlation",
      status: "SKIP",
      detail: "No other open positions — correlation skipped",
      measured: null,
      threshold: PRETRADE_THRESHOLDS.maxCorrelation,
    })
  } else {
    try {
      const focusBars = await getDailyBars(ctx.ticker, "3mo")
      const focusRets = closesToReturns(focusBars.map((b) => b.close))
      if (focusRets.length < 5) {
        checks.push({
          id: "correlation",
          label: "Position correlation",
          status: "WARN",
          detail: "Insufficient price history for correlation — skipped (no invent)",
          measured: null,
          threshold: PRETRADE_THRESHOLDS.maxCorrelation,
        })
      } else {
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
          checks.push({
            id: "correlation",
            label: "Position correlation",
            status: "WARN",
            detail: "Could not compute pairwise returns correlation — skipped",
            measured: null,
            threshold: PRETRADE_THRESHOLDS.maxCorrelation,
          })
        } else {
          const pass = Math.abs(maxAbsCorr) < PRETRADE_THRESHOLDS.maxCorrelation
          checks.push({
            id: "correlation",
            label: "Position correlation",
            status: pass ? "PASS" : "FAIL",
            detail: pass
              ? `Max |corr| vs ${maxPair}: ${maxAbsCorr.toFixed(3)} < ${PRETRADE_THRESHOLDS.maxCorrelation}`
              : `Max |corr| vs ${maxPair}: ${maxAbsCorr.toFixed(3)} ≥ ${PRETRADE_THRESHOLDS.maxCorrelation}`,
            measured: maxAbsCorr,
            threshold: PRETRADE_THRESHOLDS.maxCorrelation,
          })
        }
      }
    } catch (err) {
      checks.push({
        id: "correlation",
        label: "Position correlation",
        status: "WARN",
        detail: `Correlation skipped: ${err instanceof Error ? err.message : "error"}`,
        measured: null,
        threshold: PRETRADE_THRESHOLDS.maxCorrelation,
      })
    }
  }

  const failed = checks.filter((c) => c.status === "FAIL")
  const hold = failed.length > 0
  const reason = hold
    ? `PRETRADE HOLD — ${failed.map((f) => `${f.id}: ${f.detail}`).join("; ")}`
    : "Pre-trade checklist passed"

  console.log(
    `[SmartExecution] checklist ${ctx.ticker} ${hold ? "HOLD" : "PASS"} — ` +
      checks.map((c) => `${c.id}=${c.status}`).join(" "),
  )

  return { passed: !hold, hold, reason, checks, ranAt }
}

// ── Smart order plan builder ────────────────────────────────────────────────

export function buildSmartOrderPlan(input: BuildSmartOrderPlanInput): SmartOrderPlan {
  const atr =
    input.atr != null && Number.isFinite(input.atr) && input.atr > 0 ? input.atr : null
  const trailDistance = atr != null ? atr * PRETRADE_THRESHOLDS.atrTrailMultiple : null

  let initialStop = input.stopLoss
  if (trailDistance != null) {
    if (input.direction === "BUY") {
      initialStop = parseFloat((input.currentPrice - trailDistance).toFixed(4))
    } else {
      initialStop = parseFloat((input.currentPrice + trailDistance).toFixed(4))
    }
  }

  // VWAP: 3–5 slices by notional size
  const notional = input.shares * input.currentPrice
  const sliceCount =
    notional >= 25_000
      ? PRETRADE_THRESHOLDS.vwapMaxSlices
      : notional >= 10_000
        ? 4
        : PRETRADE_THRESHOLDS.vwapMinSlices
  const qtyParts = splitQuantity(input.shares, sliceCount)
  const displayPct = PRETRADE_THRESHOLDS.icebergDisplayPct
  const displayTotal = parseFloat((input.shares * displayPct).toFixed(4))

  const slices: SmartOrderSlice[] = qtyParts.map((quantity, index) => ({
    index: index + 1,
    quantity,
    displayQuantity: parseFloat((quantity * displayPct).toFixed(4)),
    limitPriceHint: input.limitPrice ?? input.currentPrice,
  }))

  const kinds: SmartOrderKind[] = ["BRACKET", "OCO", "TRAILING", "VWAP_SLICE", "ICEBERG"]

  const plan: SmartOrderPlan = {
    planId: `smart_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    ticker: input.ticker.toUpperCase(),
    direction: input.direction,
    kinds,
    entry: {
      quantity: input.shares,
      limitPrice: input.limitPrice ?? input.currentPrice,
      orderType: "LMT",
      reality: "REAL",
    },
    bracket: {
      stopLoss: initialStop,
      takeProfit: input.takeProfit,
      ibkrNative: "PLANNED",
      monitor: "REAL",
    },
    oco: {
      note: "OCO simulated client-side: PositionMonitor exits on TP or SL; hitting one ends monitoring (cancels the other).",
      reality: "REAL",
    },
    trailing: {
      atr,
      atrMultiple: PRETRADE_THRESHOLDS.atrTrailMultiple,
      trailDistance,
      initialStop,
      reality: atr != null ? "REAL" : "PLANNED",
    },
    vwap: {
      slices,
      reality: "PLANNED",
    },
    iceberg: {
      totalQuantity: input.shares,
      displayQuantity: Math.max(displayTotal, qtyParts[0] ? qtyParts[0]! * displayPct : displayTotal),
      displayPct,
      reality: "PLANNED",
    },
    brokerMapping: {
      supportedNow: "LMT_PROPOSAL_ONLY",
      realSubmitNote:
        "IBKR FastAPI ProposalCreate accepts LMT only. Submit single limit entry; attach SL/TP/trailing via PositionMonitor. VWAP slices + iceberg displayQty are PLANNED intents logged for future native mapping.",
      plannedFields: [
        "ibkr_native_bracket",
        "ibkr_native_oco",
        "vwap_multi_slice_transmit",
        "iceberg_display_size",
        atr == null ? "atr_trailing_distance" : null,
      ].filter((x): x is string => Boolean(x)),
    },
    builtAt: new Date().toISOString(),
  }

  console.log(
    `[SmartExecution] plan ${plan.planId} ${plan.ticker} REAL=[LMT entry, monitor bracket/OCO` +
      `${atr != null ? ", ATR trailing" : ""}] PLANNED=[${plan.brokerMapping.plannedFields.join(", ")}]`,
  )

  return plan
}

/** Compact summary for Telegram / logs. */
export function formatChecklistForTelegram(
  ticker: string,
  result: PreTradeChecklistResult,
): string {
  const lines = [
    "⏸ <b>PRETRADE HOLD</b> — ForgeOS",
    `📈 <b>${ticker}</b>`,
    result.reason,
    "",
    ...result.checks.map((c) => {
      const icon =
        c.status === "PASS"
          ? "✓"
          : c.status === "FAIL"
            ? "✗"
            : c.status === "WARN"
              ? "!"
              : "·"
      return `${icon} <b>${c.id}</b> [${c.status}] ${c.detail}`
    }),
  ]
  return lines.join("\n")
}

/** Trailing stop % for PositionMonitor derived from ATR plan when available. */
export function trailingStopPctFromPlan(plan: SmartOrderPlan, entryPrice: number): number | undefined {
  const dist = plan.trailing?.trailDistance
  if (dist == null || !(entryPrice > 0)) return undefined
  const pct = dist / entryPrice
  if (!Number.isFinite(pct) || pct <= 0 || pct > 0.5) return undefined
  return pct
}
