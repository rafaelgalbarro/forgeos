export interface PaperDashboardSafety {
  readonly tradingMode: string;
  readonly liveTradingEnabled: boolean;
  readonly analysisOnlyUi: boolean;
  readonly simulatedOnly: true;
}

export interface PaperDashboardOrderRow {
  readonly id: string;
  readonly symbol: string;
  readonly side: "BUY" | "SELL";
  readonly intent: string;
  readonly status: string;
  readonly quantity: number;
  readonly remainingQuantity: number;
  readonly expectedPrice: number;
  readonly executedPrice: number | null;
  readonly slippage: number | null;
  readonly latencyMs: number;
  readonly mae: number;
  readonly mfe: number;
}

export interface PaperDashboardTradeRow {
  readonly tradeId: string;
  readonly symbol: string;
  readonly quantity: number;
  readonly entryPrice: number;
  readonly exitPrice: number;
  readonly pnl: number;
  readonly commission: number;
  readonly mae: number;
  readonly mfe: number;
  readonly sessionTag: string;
  readonly regimeTag: string;
  readonly exitReason: string | null;
  readonly closedAt: string;
}

export interface PaperDashboardGateRow {
  readonly name: string;
  readonly passed: boolean;
  readonly summary: string;
}

export interface PaperDashboardReadModel {
  readonly safety: PaperDashboardSafety;
  readonly connected: boolean;
  readonly openOrders: readonly PaperDashboardOrderRow[];
  readonly positions: ReadonlyArray<{
    readonly symbol: string;
    readonly quantity: number;
    readonly averageCost: number;
    readonly realizedPnl: number;
  }>;
  readonly recentTrades: readonly PaperDashboardTradeRow[];
  readonly journal: ReadonlyArray<{ readonly type: string; readonly at: string }>;
  readonly certification: {
    readonly certified: boolean;
    readonly gates: readonly PaperDashboardGateRow[];
    readonly performanceSummary: ReadonlyArray<{ readonly label: string; readonly value: string }>;
  };
  readonly performance: {
    readonly totalPnl: string;
    readonly winRate: string;
    readonly sharpe: string;
    readonly sortino: string;
    readonly maxDrawdownPct: string;
    readonly tradeCount: number;
    readonly averageMae: string;
    readonly averageMfe: string;
    readonly averageLatencyMs: string;
    readonly averageCommission: string;
  };
}
