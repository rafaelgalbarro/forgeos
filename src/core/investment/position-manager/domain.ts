export const POSITION_MANAGER_STATES = [
  "OPENING",
  "OPEN",
  "REDUCING",
  "EXIT_PENDING",
  "CLOSED",
  "ERROR",
  "MANUAL_INTERVENTION",
  "UNKNOWN",
] as const;

export type PositionManagerState = (typeof POSITION_MANAGER_STATES)[number];

export const POSITION_MANAGER_CONTINUOUS_EVALUATIONS = [
  "STOP_LOSS",
  "TAKE_PROFIT",
  "TRAILING_STOP",
  "TIME_BASED_EXIT",
  "TREND_CHANGE",
  "THESIS_INVALIDATION",
  "VOLATILITY",
  "LIQUIDITY_DETERIORATION",
  "CRITICAL_NEWS",
  "PORTFOLIO_RISK",
  "SESSION_CLOSE",
  "DRAWDOWN",
  "CORRELATION",
  "GLOBAL_EXPOSURE",
] as const;

export type ContinuousEvaluation = (typeof POSITION_MANAGER_CONTINUOUS_EVALUATIONS)[number];

export const EXIT_REASON_PRIORITY = [
  "CRITICAL_NEWS",
  "THESIS_INVALIDATION",
  "LIQUIDITY_DETERIORATION",
  "DRAWDOWN",
  "STOP_LOSS",
  "SESSION_CLOSE",
  "PORTFOLIO_RISK",
  "GLOBAL_EXPOSURE",
  "CORRELATION",
  "VOLATILITY",
  "TREND_CHANGE",
  "TIME_BASED_EXIT",
  "TRAILING_STOP",
  "TAKE_PROFIT",
] as const;

export type ExitReason = (typeof EXIT_REASON_PRIORITY)[number];
export type ExitUrgency = "LOW" | "MEDIUM" | "HIGH" | "EMERGENCY";
export type ExitOrderType = "MARKET" | "LIMIT" | "STOP" | "STOP_LIMIT";
export type ReconciliationStatus = "OK" | "RECONCILIATION_REQUIRED";
export type PositionOrigin = "STRATEGY" | "MANUAL";

export interface ExitDecision {
  readonly positionId: string;
  readonly reason: ExitReason;
  readonly urgency: ExitUrgency;
  readonly quantity: number;
  readonly orderType: ExitOrderType;
  readonly limitPrice?: number;
  readonly expectedSlippage: number;
  readonly evidence: readonly string[];
  readonly generatedAt: string;
  readonly expiresAt: string;
}

export interface PositionLot {
  readonly fillId: string;
  readonly quantity: number;
  readonly price: number;
  readonly at: string;
}

export interface PositionSnapshot {
  readonly positionId: string;
  readonly symbol: string;
  readonly state: PositionManagerState;
  readonly origin: PositionOrigin;
  readonly quantity: number;
  readonly averagePrice: number;
  readonly openedAt: string;
  readonly updatedAt: string;
  readonly reconciliationStatus: ReconciliationStatus;
  readonly pendingExitOrderId?: string;
  readonly fills: readonly PositionLot[];
  readonly metadata?: Readonly<Record<string, string>>;
}

export interface PositionManagerEvent {
  readonly eventId: string;
  readonly positionId: string;
  readonly type:
    | "POSITION_STATE_CHANGED"
    | "EXIT_DECISION_QUEUED"
    | "PARTIAL_FILL_DETECTED"
    | "RECONCILIATION_MISMATCH_DETECTED"
    | "MANUAL_POSITION_DETECTED";
  readonly at: string;
  readonly payload: Readonly<Record<string, unknown>>;
}

export interface TransitionRule {
  readonly from: PositionManagerState;
  readonly to: PositionManagerState;
}

const TRANSITION_GRAPH: Readonly<Record<PositionManagerState, readonly PositionManagerState[]>> = {
  OPENING: ["OPEN", "ERROR", "MANUAL_INTERVENTION", "UNKNOWN"],
  OPEN: ["REDUCING", "EXIT_PENDING", "CLOSED", "ERROR", "MANUAL_INTERVENTION", "UNKNOWN"],
  REDUCING: ["OPEN", "EXIT_PENDING", "CLOSED", "ERROR", "MANUAL_INTERVENTION", "UNKNOWN"],
  EXIT_PENDING: ["REDUCING", "CLOSED", "ERROR", "MANUAL_INTERVENTION", "UNKNOWN"],
  CLOSED: [],
  ERROR: ["MANUAL_INTERVENTION", "UNKNOWN"],
  MANUAL_INTERVENTION: ["OPEN", "REDUCING", "EXIT_PENDING", "CLOSED", "UNKNOWN"],
  UNKNOWN: ["MANUAL_INTERVENTION", "OPEN", "CLOSED", "ERROR"],
};

export function assertPositionTransition(rule: TransitionRule): void {
  const allowed = TRANSITION_GRAPH[rule.from] ?? [];
  if (!allowed.includes(rule.to)) {
    throw new Error(`Invalid position transition ${rule.from} -> ${rule.to}`);
  }
}

function assertIso(value: string, field: string): void {
  if (!value || Number.isNaN(Date.parse(value))) {
    throw new Error(`${field} must be a valid ISO date.`);
  }
}

function assertPositive(value: number, field: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${field} must be > 0.`);
  }
}

function assertNonNegative(value: number, field: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${field} must be >= 0.`);
  }
}

export function ensureExitDecision(decision: ExitDecision): ExitDecision {
  if (!decision.positionId || decision.positionId.trim().length === 0) {
    throw new Error("ExitDecision.positionId is required.");
  }
  assertPositive(decision.quantity, "ExitDecision.quantity");
  assertNonNegative(decision.expectedSlippage, "ExitDecision.expectedSlippage");
  assertIso(decision.generatedAt, "ExitDecision.generatedAt");
  assertIso(decision.expiresAt, "ExitDecision.expiresAt");
  if (Date.parse(decision.expiresAt) <= Date.parse(decision.generatedAt)) {
    throw new Error("ExitDecision.expiresAt must be after generatedAt.");
  }
  if (decision.orderType === "LIMIT" || decision.orderType === "STOP_LIMIT") {
    assertPositive(decision.limitPrice ?? NaN, "ExitDecision.limitPrice");
  }
  if (decision.evidence.length === 0) {
    throw new Error("ExitDecision.evidence must include at least one item.");
  }
  return decision;
}

export function isEmergencyReason(reason: ExitReason): boolean {
  return reason === "CRITICAL_NEWS" || reason === "THESIS_INVALIDATION" || reason === "LIQUIDITY_DETERIORATION";
}

export function reasonPriority(reason: ExitReason): number {
  return EXIT_REASON_PRIORITY.indexOf(reason);
}
