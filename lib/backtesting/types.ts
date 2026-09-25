/**
 * Advanced backtesting types — ANALYSIS_ONLY, never submits orders.
 */

export type BacktestHorizon = "intraday" | "swing" | "daily5y";

export type BacktestSignalFamily = "rsi" | "macd" | "bollinger";

export type BacktestBar = {
  readonly open: number;
  readonly high: number;
  readonly low: number;
  readonly close: number;
  readonly volume: number;
  readonly date?: string;
};

export type BacktestTrade = {
  readonly entryIndex: number;
  readonly exitIndex: number;
  readonly entryPrice: number;
  readonly exitPrice: number;
  readonly pnl: number;
  readonly commission: number;
  readonly holdingBars: number;
  readonly side: "long";
};

export type BacktestMetrics = {
  readonly sharpe: number | null;
  readonly sortino: number | null;
  readonly maxDrawdownPct: number | null;
  readonly winRate: number | null;
  readonly profitFactor: number | null;
  readonly tradeCount: number;
  readonly totalReturnPct: number | null;
  readonly expectancy: number;
};

export type EquityPoint = {
  readonly index: number;
  readonly equity: number;
  readonly date?: string;
};

export type IndicatorParams = {
  readonly rsiPeriod?: number;
  readonly rsiOversold?: number;
  readonly rsiOverbought?: number;
  readonly macdFast?: number;
  readonly macdSlow?: number;
  readonly macdSignal?: number;
  readonly bbPeriod?: number;
  readonly bbMult?: number;
  readonly maxHoldBars?: number;
};

export type SimulationResult = {
  readonly params: IndicatorParams;
  readonly family: BacktestSignalFamily;
  readonly trades: readonly BacktestTrade[];
  readonly equityCurve: readonly EquityPoint[];
  readonly periodReturns: readonly number[];
  readonly metrics: BacktestMetrics;
  readonly note: string;
};

export type GridSearchTrial = {
  readonly params: IndicatorParams;
  readonly family: BacktestSignalFamily;
  readonly metrics: BacktestMetrics;
  readonly score: number;
};

export type GridSearchResult = {
  readonly family: BacktestSignalFamily;
  readonly trials: readonly GridSearchTrial[];
  readonly best: GridSearchTrial | null;
  readonly note: string;
};

export type WalkForwardFold = {
  readonly foldIndex: number;
  readonly trainStart: number;
  readonly trainEnd: number;
  readonly testStart: number;
  readonly testEnd: number;
  readonly bestParams: IndicatorParams;
  readonly family: BacktestSignalFamily;
  readonly inSample: BacktestMetrics;
  readonly outOfSample: BacktestMetrics;
  readonly oosEquity: readonly EquityPoint[];
};

export type WalkForwardAdvancedReport = {
  readonly folds: readonly WalkForwardFold[];
  readonly aggregateOos: BacktestMetrics;
  readonly equityCurve: readonly EquityPoint[];
  readonly bestOverallParams: IndicatorParams | null;
  readonly family: BacktestSignalFamily;
  readonly note: string;
};

export type AdvancedBacktestReport = {
  readonly generatedAt: string;
  readonly mode: "ANALYSIS_ONLY";
  readonly orderExecution: "disabled";
  readonly strategyReadiness: "NOT_READY";
  readonly autonomousLive: "LOCKED";
  readonly dataLabel: "YAHOO" | "DEMO";
  readonly symbol: string;
  readonly horizon: BacktestHorizon;
  readonly family: BacktestSignalFamily;
  readonly barCount: number;
  readonly interval: string;
  readonly range: string;
  readonly simulation: SimulationResult;
  readonly gridSearch: GridSearchResult | null;
  readonly walkForward: WalkForwardAdvancedReport | null;
  readonly note: string;
};
