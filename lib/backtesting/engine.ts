import "server-only";

/**
 * Advanced backtesting engine — Yahoo history + RSI/MACD/Bollinger
 * grid search + walk-forward. ANALYSIS_ONLY — never submits orders.
 */

import { loadBacktestHistory } from "./history";
import { runGridSearch } from "./grid-search";
import { simulateStrategy } from "./simulator";
import { runWalkForward } from "./walk-forward";
import type {
  AdvancedBacktestReport,
  BacktestHorizon,
  BacktestSignalFamily,
} from "./types";

export async function runAdvancedBacktest(options?: {
  readonly symbol?: string;
  readonly horizon?: BacktestHorizon;
  readonly family?: BacktestSignalFamily;
  readonly enableGridSearch?: boolean;
  readonly enableWalkForward?: boolean;
  readonly trainSize?: number;
  readonly testSize?: number;
  readonly stepSize?: number;
}): Promise<AdvancedBacktestReport> {
  const symbol = (options?.symbol ?? "DEMO").trim().toUpperCase() || "DEMO";
  const horizon = options?.horizon ?? "daily5y";
  const family = options?.family ?? "rsi";
  const enableGrid = options?.enableGridSearch !== false;
  const enableWf = options?.enableWalkForward === true;

  const history = await loadBacktestHistory(symbol, horizon);
  const baseSim = simulateStrategy({
    bars: history.bars,
    family,
    horizon,
  });

  const gridSearch = enableGrid
    ? runGridSearch({
        bars: history.bars,
        family,
        horizon,
        maxTrials: horizon === "intraday" ? 24 : 36,
      })
    : null;

  const bestParams = gridSearch?.best?.params;
  const simulation = bestParams
    ? simulateStrategy({
        bars: history.bars,
        family,
        params: bestParams,
        horizon,
      })
    : baseSim;

  const walkForward = enableWf
    ? runWalkForward({
        bars: history.bars,
        family,
        horizon,
        trainSize: options?.trainSize,
        testSize: options?.testSize,
        stepSize: options?.stepSize,
      })
    : null;

  return {
    generatedAt: new Date().toISOString(),
    mode: "ANALYSIS_ONLY",
    orderExecution: "disabled",
    strategyReadiness: "NOT_READY",
    autonomousLive: "LOCKED",
    dataLabel: history.dataLabel,
    symbol,
    horizon,
    family,
    barCount: history.bars.length,
    interval: history.interval,
    range: history.range,
    simulation,
    gridSearch,
    walkForward,
    note: [
      history.note,
      simulation.note,
      gridSearch?.note,
      walkForward?.note,
      "Zero real orders · AUTONOMOUS_LIVE LOCKED.",
    ]
      .filter(Boolean)
      .join(" "),
  };
}
