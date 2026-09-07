export type RuntimeHealthStatus = "HEALTHY" | "DEGRADED" | "CRITICAL" | "HALTED";

export type RuntimeHaltReason =
  | "HALT_SYSTEM"
  | "DAILY_LOSS"
  | "CONSECUTIVE_ERRORS"
  | "ELEVATED_LATENCY"
  | "STALE_DATA"
  | "CONNECTION_LOSS"
  | "TOO_MANY_REJECTS"
  | "ABNORMAL_SLIPPAGE"
  | "PORTFOLIO_DIVERGENCE"
  | "MESSAGE_FLOOD"
  | "STRATEGY_ANOMALIES"
  | "UNKNOWN_ORDER_DETECTED"
  | "UNKNOWN_POSITION_DETECTED"
  | "AMBIGUOUS_ORDER_STATE"
  | "RECONCILIATION_INCONSISTENCY"
  | "WATCHDOG_TIMEOUT";

export type CircuitBreakerName =
  | "daily-loss"
  | "consecutive-errors"
  | "elevated-latency"
  | "stale-data"
  | "connection-loss"
  | "too-many-rejects"
  | "abnormal-slippage"
  | "portfolio-divergence"
  | "message-flood"
  | "strategy-anomalies";

export type BreakerStatus = "CLOSED" | "OPEN";

export interface BreakerSnapshot {
  readonly name: CircuitBreakerName;
  readonly status: BreakerStatus;
  readonly trippedAtUtc: string | null;
  readonly lastValue: number;
  readonly threshold: number;
  readonly reason: RuntimeHaltReason;
}

export interface HealthSnapshot {
  readonly status: RuntimeHealthStatus;
  readonly connected: boolean;
  readonly heartbeatLagMs: number;
  readonly staleData: boolean;
  readonly messageRatePerSec: number;
  readonly latencyMs: number;
  readonly consecutiveErrors: number;
  readonly lastUpdatedUtc: string;
}

export interface BrokerOrderState {
  readonly orderId: string;
  readonly symbol: string;
  readonly quantity: number;
  readonly side: "BUY" | "SELL";
}

export interface BrokerPositionState {
  readonly symbol: string;
  readonly quantity: number;
}

export interface RuntimeReconciliationSnapshot {
  readonly timestampUtc: string;
  readonly unknownOrders: readonly BrokerOrderState[];
  readonly unknownPositions: readonly BrokerPositionState[];
  readonly portfolioDivergencePct: number;
  readonly consistent: boolean;
}

export interface RuntimeCheckpoint {
  readonly timestampUtc: string;
  readonly health: HealthSnapshot;
  readonly breakerStates: readonly BreakerSnapshot[];
  readonly haltedReason: RuntimeHaltReason | null;
}
