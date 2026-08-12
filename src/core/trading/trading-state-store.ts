/**
 * Shared persistence for trading risk + pending order approvals.
 * File: `.forgeos-trading-state.json` (project root).
 */

import fs from "node:fs"
import path from "node:path"

export const TRADING_STATE_FILE = path.resolve(process.cwd(), ".forgeos-trading-state.json")

export type PendingOrderStatus = "PENDING_APPROVAL" | "APPROVED" | "REJECTED" | "EXECUTED" | "EXPIRED"

/** Compact Phase F smart-execution snapshot persisted with pending approvals. */
export type PendingSmartPlanSnapshot = {
  planId: string
  kinds: string[]
  stopLoss?: number
  takeProfit?: number
  trailingStopPct?: number
  icebergDisplayQty?: number
  vwapSliceCount?: number
  brokerSupportedNow: string
  plannedFields: string[]
  realSubmitNote: string
}

export type PendingChecklistSnapshot = {
  passed: boolean
  reason: string
  ranAt: string
  failedIds: string[]
}

export type PendingOrderRecord = {
  approvalId: string
  status: PendingOrderStatus
  ticker: string
  direction: "BUY" | "SELL"
  shares: number
  orderType: string
  limitPrice?: number
  orderValueUSD: number
  price: number
  stopLoss?: number
  takeProfit?: number
  reason: string
  signal: { confidence: number; reasoning: string; urgency: string }
  createdAt: string
  updatedAt: string
  orderId?: string
  waitUntil?: string
  outsideRth?: boolean
  /** Phase F — smart execution plan (LMT real; bracket/VWAP/iceberg mostly planned). */
  smartPlan?: PendingSmartPlanSnapshot
  preTradeChecklist?: PendingChecklistSnapshot
}

export type MonitoredPosition = {
  ticker: string
  shares: number
  entryPrice: number
  stopLoss: number
  takeProfit: number
  trailingStopPct?: number
  highestPrice?: number
  openedAt: string
  orderId?: string
  staleNotified?: boolean
}

export type RecentSignalRecord = {
  ticker: string
  direction: string
  confidence: number
  at: string
}

export type RiskPersistedSlice = {
  halted: boolean
  haltReason: string
  dailyTradeCount: number
  lastResetDate: string
  autoApprovalDailyCount: number
  autoApprovalLastResetDate: string
}

export type TradingPersistedState = {
  risk: RiskPersistedSlice
  pendingOrders: PendingOrderRecord[]
  monitoredPositions: MonitoredPosition[]
  recentSignals: RecentSignalRecord[]
  tradingPaused: boolean
}

const DEFAULT_STATE: TradingPersistedState = {
  risk: {
    halted: false,
    haltReason: "",
    dailyTradeCount: 0,
    lastResetDate: new Date().toDateString(),
    autoApprovalDailyCount: 0,
    autoApprovalLastResetDate: new Date().toDateString(),
  },
  pendingOrders: [],
  monitoredPositions: [],
  recentSignals: [],
  tradingPaused: false,
}

export function loadTradingState(): TradingPersistedState {
  try {
    if (!fs.existsSync(TRADING_STATE_FILE)) return structuredClone(DEFAULT_STATE)
    const raw = fs.readFileSync(TRADING_STATE_FILE, "utf8").replace(/^\uFEFF/, "")
    if (!raw.trim()) return structuredClone(DEFAULT_STATE)
    const parsed = JSON.parse(raw) as Partial<TradingPersistedState>
    return {
      risk: {
        halted: Boolean(parsed.risk?.halted),
        haltReason: typeof parsed.risk?.haltReason === "string" ? parsed.risk.haltReason : "",
        dailyTradeCount:
          typeof parsed.risk?.dailyTradeCount === "number" ? parsed.risk.dailyTradeCount : 0,
        lastResetDate:
          typeof parsed.risk?.lastResetDate === "string"
            ? parsed.risk.lastResetDate
            : new Date().toDateString(),
        autoApprovalDailyCount:
          typeof parsed.risk?.autoApprovalDailyCount === "number"
            ? parsed.risk.autoApprovalDailyCount
            : 0,
        autoApprovalLastResetDate:
          typeof parsed.risk?.autoApprovalLastResetDate === "string"
            ? parsed.risk.autoApprovalLastResetDate
            : new Date().toDateString(),
      },
      pendingOrders: Array.isArray(parsed.pendingOrders) ? parsed.pendingOrders : [],
      monitoredPositions: Array.isArray(parsed.monitoredPositions) ? parsed.monitoredPositions : [],
      recentSignals: Array.isArray(parsed.recentSignals) ? parsed.recentSignals : [],
      tradingPaused: Boolean(parsed.tradingPaused),
    }
  } catch {
    return structuredClone(DEFAULT_STATE)
  }
}

export function saveTradingState(state: TradingPersistedState): void {
  const dir = path.dirname(TRADING_STATE_FILE)
  fs.mkdirSync(dir, { recursive: true })
  const tmp = `${TRADING_STATE_FILE}.tmp`
  fs.writeFileSync(tmp, JSON.stringify(state, null, 2), "utf8")
  fs.renameSync(tmp, TRADING_STATE_FILE)
}

export function updateTradingState(
  mutator: (state: TradingPersistedState) => TradingPersistedState,
): TradingPersistedState {
  const next = mutator(loadTradingState())
  saveTradingState(next)
  return next
}
