/**
 * Parameter grid search for RSI / MACD / Bollinger — ANALYSIS_ONLY.
 */

import { scoreMetrics } from "./metrics";
import { simulateStrategy } from "./simulator";
import type {
  BacktestBar,
  BacktestHorizon,
  BacktestSignalFamily,
  GridSearchResult,
  GridSearchTrial,
  IndicatorParams,
} from "./types";

function rsiGrid(): IndicatorParams[] {
  const out: IndicatorParams[] = [];
  for (const rsiPeriod of [7, 10, 14]) {
    for (const rsiOversold of [25, 30]) {
      for (const rsiOverbought of [70, 75]) {
        for (const maxHoldBars of [5, 10]) {
          out.push({ rsiPeriod, rsiOversold, rsiOverbought, maxHoldBars });
        }
      }
    }
  }
  return out;
}

function macdGrid(): IndicatorParams[] {
  const out: IndicatorParams[] = [];
  for (const macdFast of [8, 12]) {
    for (const macdSlow of [21, 26]) {
      if (macdFast >= macdSlow) continue;
      for (const macdSignal of [5, 9]) {
        for (const maxHoldBars of [5, 10]) {
          out.push({ macdFast, macdSlow, macdSignal, maxHoldBars });
        }
      }
    }
  }
  return out;
}

function bollingerGrid(): IndicatorParams[] {
  const out: IndicatorParams[] = [];
  for (const bbPeriod of [15, 20]) {
    for (const bbMult of [1.5, 2, 2.5]) {
      for (const maxHoldBars of [5, 10]) {
        out.push({ bbPeriod, bbMult, maxHoldBars });
      }
    }
  }
  return out;
}

export function buildParamGrid(family: BacktestSignalFamily): IndicatorParams[] {
  switch (family) {
    case "rsi":
      return rsiGrid();
    case "macd":
      return macdGrid();
    case "bollinger":
      return bollingerGrid();
  }
}

export function runGridSearch(input: {
  readonly bars: readonly BacktestBar[];
  readonly family: BacktestSignalFamily;
  readonly horizon?: BacktestHorizon;
  readonly grid?: readonly IndicatorParams[];
  readonly maxTrials?: number;
}): GridSearchResult {
  const grid = [...(input.grid ?? buildParamGrid(input.family))];
  const maxTrials = Math.min(Math.max(input.maxTrials ?? 48, 4), 96);
  const sliced = grid.slice(0, maxTrials);
  const trials: GridSearchTrial[] = sliced.map((params) => {
    const sim = simulateStrategy({
      bars: input.bars,
      family: input.family,
      params,
      horizon: input.horizon,
    });
    return {
      params,
      family: input.family,
      metrics: sim.metrics,
      score: scoreMetrics(sim.metrics),
    };
  });
  trials.sort((a, b) => b.score - a.score);
  return {
    family: input.family,
    trials,
    best: trials[0] ?? null,
    note: `Grid search ${trials.length} trial(s) on ${input.family} — ANALYSIS_ONLY, no orders.`,
  };
}
