export interface ShadowTradingConfig {
  readonly shadowMode: boolean;
  readonly liveTradingEnabled: boolean;
  readonly minimumDurationMs: number;
}

export interface ShadowSignalInput {
  readonly signalId: string;
  readonly occurredAtUtc: string;
  readonly symbol: string;
  readonly side: "BUY" | "SELL";
  readonly quantity: number;
  readonly expectedPrice: number;
  readonly strategy: string;
  readonly reason: string;
}

export interface ShadowMarketContext {
  readonly capturedAtUtc: string;
  readonly bid?: number;
  readonly ask?: number;
  readonly last: number;
  readonly latencyMs: number;
  readonly liquidityScore: number;
  readonly missingData: readonly string[];
}

export interface ShadowPortfolioContext {
  readonly accountEquity: number;
  readonly cashAvailable: number;
  readonly currentPositionQty: number;
}

export interface PaperTradeReference {
  readonly simulatedFillPrice: number;
  readonly simulatedPnl: number;
  readonly simulatedSlippageBps: number;
}

export interface ShadowEvaluationInput {
  readonly signal: ShadowSignalInput;
  readonly market: ShadowMarketContext;
  readonly portfolio: ShadowPortfolioContext;
  readonly sessionOpen: boolean;
  readonly nowUtc: string;
  readonly paperReference?: PaperTradeReference;
}

export interface ShadowHypotheticalOrder {
  readonly orderId: string;
  readonly symbol: string;
  readonly side: "BUY" | "SELL";
  readonly quantity: number;
  readonly expectedPrice: number;
  readonly achievablePrice: number;
  readonly notional: number;
}

export interface ShadowSimulatedFill {
  readonly status: "FILLED" | "PARTIAL" | "REJECTED";
  readonly fillPrice: number;
  readonly filledQuantity: number;
  readonly slippageBps: number;
}

export interface ShadowEvaluationOutcome {
  readonly signalId: string;
  readonly occurredAtUtc: string;
  readonly hypotheticalOrder: ShadowHypotheticalOrder;
  readonly simulatedFill: ShadowSimulatedFill;
  readonly result: "SIMULATED_PROFIT" | "SIMULATED_LOSS" | "SIMULATED_FLAT" | "REJECTED";
  readonly estimatedPnl: number;
  readonly portfolioImpact: {
    readonly exposureChangePct: number;
    readonly cashDelta: number;
  };
  readonly paperDifference: {
    readonly pnlDelta: number;
    readonly slippageDeltaBps: number;
    readonly fillPriceDelta: number;
  } | null;
  readonly rejectedSignals: readonly string[];
  readonly avoidedRisk: readonly string[];
  readonly latencyMs: number;
  readonly missingData: readonly string[];
  readonly decisionReasons: readonly string[];
}

export interface ShadowAuditRecord {
  readonly recordedAtUtc: string;
  readonly provenance: {
    readonly source: string;
    readonly traceId: string;
  };
  readonly outcome: ShadowEvaluationOutcome;
}
