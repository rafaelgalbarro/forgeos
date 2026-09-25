export interface ShadowOperationRow {
  readonly signalId: string;
  readonly symbol: string;
  readonly side: "BUY" | "SELL";
  readonly expectedPrice: number;
  readonly achievablePrice: number;
  readonly fillPrice: number;
  readonly estimatedPnl: number;
  readonly slippageBps: number;
  readonly latencyMs: number;
  readonly rejected: boolean;
  readonly missingData: readonly string[];
  readonly avoidedRisk: readonly string[];
}

export interface ShadowDashboardReadModel {
  readonly safety: {
    readonly shadowMode: boolean;
    readonly liveTradingEnabled: boolean;
    readonly minimumDurationMs: number;
  };
  readonly hypotheticalOperations: readonly ShadowOperationRow[];
  readonly hypotheticalPnl: number;
  readonly paperVsRealDifferences: readonly string[];
  readonly rejectedSignals: readonly string[];
  readonly avoidedRisk: readonly string[];
  readonly avgLatencyMs: number;
  readonly missingDataSummary: readonly string[];
}
