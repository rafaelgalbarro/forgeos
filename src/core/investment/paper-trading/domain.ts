/**
 * Institutional paper trading domain.
 * Simulated execution only — never activates live trading.
 */

export type PaperTradingMode = "paper";

export type PaperOrderIntent = "ENTRY" | "EXIT" | "STOP" | "TARGET" | "TRAILING_STOP";

export type PaperOrderStatus =
  | "PENDING"
  | "PARTIALLY_FILLED"
  | "FILLED"
  | "CANCELED"
  | "REJECTED"
  | "EXPIRED"
  | "REPLACED";

export type PaperLifecycleEventType =
  | "CREATED"
  | "DECISIONED"
  | "SENT"
  | "PARTIAL_FILL"
  | "FILLED"
  | "CANCELED"
  | "REJECTED"
  | "EXPIRED"
  | "REPLACED"
  | "TRAIL_UPDATED"
  | "STOP_TRIGGERED"
  | "TAKE_PROFIT_TRIGGERED"
  | "RECONNECTED"
  | "RECONCILED_AFTER_RESTART";

export interface PaperTradingConfig {
  readonly tradingMode: PaperTradingMode;
  readonly liveTradingEnabled: boolean;
  readonly analysisOnlyUi: boolean;
  readonly startingEquity: number;
  readonly riskFreeRate: number;
  readonly certificationWindowDays: number;
  readonly minimumClosedTrades: number;
}

export interface PaperMarketContext {
  readonly bid: number;
  readonly ask: number;
  readonly expectedPrice: number;
  readonly markPrice?: number;
}

export interface PaperSignalInput {
  readonly signalId: string;
  readonly symbol: string;
  readonly side: "BUY" | "SELL";
  readonly quantity: number;
  readonly intent: PaperOrderIntent;
  readonly strategy: string;
  readonly thesis: string;
  readonly sessionTag: string;
  readonly regimeTag: string;
  readonly market: PaperMarketContext;
  readonly trailingOffset?: number;
  readonly stopPrice?: number;
  readonly takeProfitPrice?: number;
  readonly commissionPerShare?: number;
  readonly decisionTime?: string;
  readonly sendTime?: string;
  readonly currency?: string;
  readonly exchange?: string;
}

export interface PaperCommitteeContext {
  readonly approved: boolean;
  readonly dissentingVotes: number;
  readonly reasoning: string;
  readonly confidence: number;
}

export interface PaperRiskContext {
  readonly approved: boolean;
  readonly level: "LOW" | "MEDIUM" | "HIGH";
  readonly monetaryRisk: number;
  readonly percentRisk: number;
  readonly reason: string;
  readonly decision?: "PASS" | "PASS_WITH_REDUCED_SIZE" | "BLOCK" | "HALT_SYSTEM";
  readonly reducedQuantity?: number;
}

export interface PaperBrainContext {
  readonly recommendation: string;
  readonly confidence: number;
  readonly reasoning: readonly string[];
}

export interface PaperRuntimeContext {
  readonly sessionOpen: boolean;
  readonly dataFresh: boolean;
  readonly brokerConnected: boolean;
  readonly latencyMs: number;
}

export interface PaperTradeSubmissionInput {
  readonly signal: PaperSignalInput;
  readonly brain?: PaperBrainContext;
  readonly committee?: PaperCommitteeContext;
  readonly risk?: PaperRiskContext;
  readonly runtime?: PaperRuntimeContext;
  readonly pipelineId?: string;
  readonly nowUtc?: string;
}

export interface PaperClosedTrade {
  readonly tradeId: string;
  readonly symbol: string;
  readonly quantity: number;
  readonly entryPrice: number;
  readonly exitPrice: number;
  readonly pnl: number;
  readonly commission: number;
  readonly mae: number;
  readonly mfe: number;
  readonly latencyMs: number;
  readonly sessionTag: string;
  readonly regimeTag: string;
  readonly exitReason: string | null;
  readonly closedAt: string;
  /** Present when the originating paper signal carried signalId. */
  readonly signalId?: string;
}

export interface PaperOrderSnapshot {
  readonly id: string;
  readonly orderId: number;
  readonly symbol: string;
  readonly side: "BUY" | "SELL";
  readonly intent: PaperOrderIntent;
  readonly quantity: number;
  readonly remainingQuantity: number;
  readonly status: PaperOrderStatus;
  readonly sessionTag: string;
  readonly regimeTag: string;
  readonly metrics: {
    readonly expectedPrice: number;
    readonly executedPrice: number | null;
    readonly slippage: number | null;
    readonly commission: number;
    readonly latencyMs: number;
    readonly mae: number;
    readonly mfe: number;
    readonly pnl: number;
    readonly exitReason: string | null;
  };
  readonly events: ReadonlyArray<{ type: string; at: string }>;
}

export interface PaperPositionSnapshot {
  readonly symbol: string;
  readonly quantity: number;
  readonly averageCost: number;
  readonly realizedPnl: number;
}

export interface PaperBrokerStateSnapshot {
  readonly connected: boolean;
  readonly orders: readonly PaperOrderSnapshot[];
  readonly closedTrades: readonly PaperClosedTrade[];
  readonly positions: readonly PaperPositionSnapshot[];
  readonly journal: ReadonlyArray<{ type: string; at: string; detail?: Record<string, unknown> }>;
}

export interface CertificationGate {
  readonly required: number;
  readonly actual: number;
  readonly passed: boolean;
}

/**
 * Institutional certification report — extends broker report with risk ratios.
 */
export interface PaperTradingCertificationReport {
  readonly type: "PaperTradingCertificationReport";
  readonly generatedAt: string;
  readonly tradingMode: "paper";
  readonly liveTradingEnabled: false;
  readonly evaluationWindow: { readonly days: number; readonly from: string; readonly to: string };
  readonly gates: {
    readonly minimumClosedTrades: CertificationGate;
    readonly minimumEvaluationDays: CertificationGate;
    readonly multipleSessions: CertificationGate;
    readonly multipleRegimes: CertificationGate;
  };
  readonly performance: {
    readonly totalPnl: number;
    readonly averagePnl: number;
    readonly winRate: number;
    readonly averageLatencyMs: number;
    readonly averageSlippage: number;
    readonly averageCommission: number;
    readonly averageMae: number;
    readonly averageMfe: number;
    readonly sharpe: number | null;
    readonly sortino: number | null;
    readonly maxDrawdownPct: number | null;
  };
  readonly certified: boolean;
  readonly closedTrades: readonly PaperClosedTrade[];
}

export interface PaperTradingPerformanceReport {
  readonly type: "PaperTradingPerformanceReport";
  readonly generatedAt: string;
  readonly tradingMode: "paper";
  readonly liveTradingEnabled: false;
  readonly startingEquity: number;
  readonly endingEquity: number;
  readonly totalPnl: number;
  readonly realizedPnl: number;
  readonly winRate: number;
  readonly tradeCount: number;
  readonly openOrderCount: number;
  readonly openPositionCount: number;
  readonly averageLatencyMs: number;
  readonly averageSlippage: number;
  readonly averageCommission: number;
  readonly averageMae: number;
  readonly averageMfe: number;
  readonly sharpe: number | null;
  readonly sortino: number | null;
  readonly maxDrawdownPct: number | null;
  readonly equityCurve: readonly number[];
  readonly periodReturns: readonly number[];
  readonly bySession: ReadonlyArray<{ readonly sessionTag: string; readonly pnl: number; readonly trades: number }>;
  readonly byRegime: ReadonlyArray<{ readonly regimeTag: string; readonly pnl: number; readonly trades: number }>;
}

export interface PaperOperationOutcome {
  readonly operationId: string;
  readonly pipelineId: string | null;
  readonly orderId: string | null;
  readonly status:
    | "REJECTED_BY_COMMITTEE"
    | "REJECTED_BY_RISK"
    | "REJECTED_BY_RUNTIME"
    | "PAPER_SUBMITTED"
    | "FILLED"
    | "PARTIALLY_FILLED"
    | "CANCELED"
    | "REJECTED"
    | "EXPIRED";
  readonly reason: string;
  readonly quantity: number;
  readonly fillPrice: number | null;
  readonly slippage: number | null;
  readonly commission: number;
  readonly latencyMs: number;
  readonly mae: number;
  readonly mfe: number;
  readonly pnl: number;
  readonly liveTradingActivated: false;
}

export interface PaperTradingDashboardModel {
  readonly safety: {
    readonly tradingMode: string;
    readonly liveTradingEnabled: boolean;
    readonly analysisOnlyUi: boolean;
    readonly simulatedOnly: true;
  };
  readonly connected: boolean;
  readonly openOrders: readonly PaperOrderSnapshot[];
  readonly positions: readonly PaperPositionSnapshot[];
  readonly recentTrades: readonly PaperClosedTrade[];
  readonly journal: ReadonlyArray<{ type: string; at: string }>;
  readonly certification: PaperTradingCertificationReport;
  readonly performance: PaperTradingPerformanceReport;
}
