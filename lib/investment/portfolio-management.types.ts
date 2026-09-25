/**
 * Browser-safe portfolio management contracts — ANALYSIS_ONLY, no order path.
 */

export type MetricDisplay = {
  readonly label: string;
  readonly value: number | null;
  readonly display: string;
  readonly status: "MEASURED" | "ESTIMATED" | "NO_DATA";
  readonly unit?: "CURRENCY" | "PCT" | "RATIO" | "COUNT";
  readonly note?: string;
};

export type AllocationBucket = {
  readonly key: string;
  readonly label: string;
  readonly weightPct: number | null;
  readonly exposure: number | null;
  readonly riskPct: number | null;
};

export type PortfolioPositionRow = {
  readonly ticker: string;
  readonly name: string;
  readonly quantity: number;
  readonly avgPrice: number;
  readonly currentPrice: number | null;
  readonly pnl: number | null;
  readonly returnPct: number | null;
  readonly weightPct: number | null;
  readonly risk: string;
  readonly aiRecommendation: string;
  readonly currency: string;
  readonly secType: string;
  readonly sector: string;
  readonly country: string;
  readonly exchange: string;
};

export type EquityPoint = {
  readonly index: number;
  readonly equity: number;
};

export type PortfolioManagementSnapshot = {
  readonly generatedAt: string;
  readonly mode: "ANALYSIS_ONLY";
  readonly orderExecution: "disabled";
  readonly liveTradingEnabled: false;
  readonly dataSource: "IBKR_LIVE_READ_ONLY" | "DEMO" | "UNAVAILABLE";
  readonly baseCurrency: string;
  readonly note: string;
  readonly summary: {
    readonly portfolioValue: MetricDisplay;
    readonly pnlDaily: MetricDisplay;
    readonly pnlWeekly: MetricDisplay;
    readonly pnlMonthly: MetricDisplay;
    readonly pnlAnnual: MetricDisplay;
    readonly cash: MetricDisplay;
    readonly buyingPower: MetricDisplay;
    readonly capitalInvested: MetricDisplay;
    readonly capitalLibre: MetricDisplay;
    readonly unrealizedPnl: MetricDisplay;
    readonly positionCount: MetricDisplay;
  };
  readonly allocations: {
    readonly bySector: readonly AllocationBucket[];
    readonly byCountry: readonly AllocationBucket[];
    readonly byCurrency: readonly AllocationBucket[];
    readonly byMarket: readonly AllocationBucket[];
    readonly byProduct: readonly AllocationBucket[];
  };
  readonly risk: {
    readonly var95: MetricDisplay;
    readonly drawdown: MetricDisplay;
    readonly sharpe: MetricDisplay;
    readonly sortino: MetricDisplay;
    readonly calmar: MetricDisplay;
    readonly volatility: MetricDisplay;
    readonly beta: MetricDisplay;
    readonly correlations: MetricDisplay;
    readonly concentration: MetricDisplay;
    readonly stressTest: MetricDisplay;
    readonly stressLines: readonly string[];
  };
  readonly positions: readonly PortfolioPositionRow[];
  readonly equityCurve: readonly EquityPoint[];
  readonly committeeRecommendation: string | null;
};
