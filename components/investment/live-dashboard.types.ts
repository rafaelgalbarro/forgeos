/**
 * Browser-safe LIVE TRADING OS control surface contracts.
 * AUTONOMOUS_LIVE may exist but remains LOCKED — no order path from the client.
 */

export type LiveControlMode = "SUPERVISED" | "AUTONOMOUS_LIVE" | "ANALYSIS_ONLY";
export type LiveControlState = "LOCKED" | "ACTIVE" | "HALTED" | "UNLOCKED";
export type LiveDataFreshness = "LIVE" | "DELAYED" | "UNKNOWN" | "NO_DATA";

export type LiveApprovalStatus =
  | "PENDING_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "EXPIRED"
  | "BLOCKED"
  | "EXECUTED";

export type ReadinessStatus = "OK" | "WARN" | "FAIL" | "UNKNOWN" | "NO_DATA";

export interface LiveReadinessItem {
  readonly id: string;
  readonly label: string;
  readonly status: ReadinessStatus;
  readonly detail: string;
}

export interface LiveCandidateRow {
  readonly id: string;
  readonly symbol: string;
  readonly side: "BUY" | "SELL";
  readonly strategy: string;
  readonly qty: number;
  readonly entry: number;
  readonly stop: number;
  readonly target: number;
  readonly notional: number;
  readonly monetaryRisk: number;
  readonly pctRisk: number;
  readonly spread: number | null;
  readonly estimatedSlippage: number | null;
  readonly marketSession: string;
  readonly confidence: number | null;
  readonly committeeConsensus: string;
  readonly riskDecision: string;
  readonly expiresAt: string;
  readonly priority?: number;
  readonly score?: number;
  readonly decision?: "TRADE" | "NO_TRADE";
  readonly reasoning?: readonly string[];
  readonly dataFreshness?: LiveDataFreshness;
}

export interface LiveApprovalRow {
  readonly id: string;
  readonly candidateId: string;
  readonly symbol: string;
  readonly side: "BUY" | "SELL";
  readonly qty: number;
  readonly status: LiveApprovalStatus;
  readonly expiresAt: string;
  readonly firstConfirmedAt?: string | null;
  readonly secondConfirmedAt?: string | null;
  readonly note?: string;
}

export interface LiveOpenOrderRow {
  readonly orderId: string;
  readonly symbol: string;
  readonly action: string;
  readonly orderType: string;
  readonly quantity: number;
  readonly limitPrice: number | null;
  readonly status: string;
}

export interface LivePositionRow {
  readonly account: string;
  readonly symbol: string;
  readonly position: number;
  readonly avgCost: number;
  readonly stopProtection: string;
  readonly targetProtection: string;
  readonly marketPrice?: number | null;
  readonly unrealizedPnl?: number | null;
  readonly overlayAction?: string;
  readonly overlayReason?: string;
}

export interface LiveDailyRiskSnapshot {
  readonly dailyPnl: number | null;
  readonly maxLoss: number | null;
  readonly drawdown: number | null;
  readonly usedRisk: number | null;
  readonly dayOrders: number | null;
  readonly newPositions: number | null;
  readonly exposure: number | null;
  readonly remainingLimits: string;
  readonly note: string;
}

export interface LiveTradingSafetyFlags {
  readonly liveTradingEnabled: boolean;
  readonly ibkrReadOnly: boolean;
  readonly tradingMode: string;
  readonly mode: LiveControlMode;
  readonly state: LiveControlState;
  readonly autonomousLock: "LOCKED" | "ACTIVE" | "HALTED";
  readonly emergencyStop: boolean;
  readonly blockNewEntries: boolean;
  readonly reduceOnly: boolean;
  readonly executionDisconnected: boolean;
}

export interface LiveSystemStatePanel {
  readonly tradingMode: string;
  readonly autonomousLock: string;
  readonly dataFreshness: LiveDataFreshness;
  readonly haltReason: string | null;
  readonly blockNewEntries: boolean;
}

export interface LiveBrokerStatePanel {
  readonly connected: boolean;
  readonly healthOk: boolean | null;
  readonly accountsMasked: readonly string[];
  readonly nextValidId: string;
  readonly error: string | null;
}

export interface LiveAiStatePanel {
  readonly brain: ReadinessStatus;
  readonly committee: ReadinessStatus;
  readonly ensembleStrategies: number;
  readonly analysisLoop: string;
  readonly detail: string;
}

export interface LiveActiveSignalRow {
  readonly id: string;
  readonly symbol: string;
  readonly side: string;
  readonly strength: number;
  readonly source: string;
  readonly note: string;
}

export interface LiveProfitabilityPanel {
  readonly dailyPnl: number | null;
  readonly unrealizedPnl: number | null;
  readonly realizedPnl: number | null;
  readonly note: string;
}

export interface LiveOperationsPanel {
  readonly openOrders: number;
  readonly positions: number;
  readonly opportunities: number;
  readonly noTradeCount: number;
  readonly ordersSubmitted: 0;
}

export interface LiveAuditLogRow {
  readonly id: string;
  readonly at: string;
  readonly event: string;
  readonly detail: string;
}

export interface LiveSystemPerformancePanel {
  readonly snapshotLatencyMs: number | null;
  readonly symbolsScanned: number;
  readonly stagesOk: boolean;
  readonly note: string;
}

export interface LiveLimitsPanel {
  readonly maxOrderNotionalEur: number;
  readonly maxNewExposureDailyEur: number;
  readonly maxOpenPositions: number;
  readonly maxTradesPerDay: number;
  readonly maxDailyLossPct: number;
  readonly maxConsecutiveLosses: number;
}

export interface LiveCircuitBreakerRow {
  readonly code: string;
  readonly reason: string;
  readonly at: string;
}

export interface LiveSampleGateRow {
  readonly id: string;
  readonly name: string;
  readonly required: string;
  readonly actual: string;
  readonly status: string;
  readonly evidence: string;
}

export interface LiveStrategyReadinessPanel {
  readonly goLiveDecision: string;
  readonly overallSample: string;
  readonly unlockEligible: false;
  readonly paperClosedTrades: number;
  readonly paperSessions: number;
  readonly shadowOps: number;
  readonly shadowDays: number;
  readonly gates: readonly LiveSampleGateRow[];
  readonly note: string;
}

export interface LiveGoLiveUnlockPanel {
  readonly blocked: true;
  readonly buttonEnabled: false;
  readonly reason: string;
  readonly certificationPass: false;
  readonly liveTradingEnabled: false;
  readonly autonomousLive: "LOCKED";
  readonly note: string;
}

export interface LiveTradingDashboardReadModel {
  readonly generatedAt: string;
  readonly safety: LiveTradingSafetyFlags;
  readonly systemState: LiveSystemStatePanel;
  readonly brokerState: LiveBrokerStatePanel;
  readonly aiState: LiveAiStatePanel;
  readonly readiness: readonly LiveReadinessItem[];
  readonly strategyReadiness: LiveStrategyReadinessPanel;
  readonly goLiveUnlock: LiveGoLiveUnlockPanel;
  readonly candidates: readonly LiveCandidateRow[];
  readonly activeSignals: readonly LiveActiveSignalRow[];
  readonly approvals: readonly LiveApprovalRow[];
  readonly openOrders: readonly LiveOpenOrderRow[];
  readonly positions: readonly LivePositionRow[];
  readonly dailyRisk: LiveDailyRiskSnapshot;
  readonly profitability: LiveProfitabilityPanel;
  readonly operations: LiveOperationsPanel;
  readonly limits: LiveLimitsPanel;
  readonly circuitBreakers: readonly LiveCircuitBreakerRow[];
  readonly auditLog: readonly LiveAuditLogRow[];
  readonly history: readonly LiveAuditLogRow[];
  readonly systemPerformance: LiveSystemPerformancePanel;
  readonly note: string;
  readonly badges: readonly string[];
}
