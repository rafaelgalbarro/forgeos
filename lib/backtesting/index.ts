/**
 * ForgeOS advanced backtesting — ANALYSIS_ONLY research surface.
 * Prefer this module for Yahoo multi-year history, grid search, and walk-forward.
 * Existing Strategy Engine walks remain in lib/investment/backtest-runner.ts.
 */

export { runAdvancedBacktest } from "./engine";
export { loadBacktestHistory, horizonToYahoo } from "./history";
export { runGridSearch, buildParamGrid } from "./grid-search";
export { runWalkForward } from "./walk-forward";
export { simulateStrategy } from "./simulator";
export { buildSignalSeries, defaultParams } from "./signals";
export { computeBacktestMetrics, scoreMetrics, computeProfitFactorFromTrades } from "./metrics";
export type {
  AdvancedBacktestReport,
  BacktestBar,
  BacktestHorizon,
  BacktestMetrics,
  BacktestSignalFamily,
  BacktestTrade,
  EquityPoint,
  GridSearchResult,
  GridSearchTrial,
  IndicatorParams,
  SimulationResult,
  WalkForwardAdvancedReport,
  WalkForwardFold,
} from "./types";
