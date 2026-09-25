/**
 * Walk-forward testing: optimize on train, evaluate on held-out test.
 * Reduces overfitting vs fitting the full sample once.
 */

import { computeBacktestMetrics, scoreMetrics } from "./metrics";
import { runGridSearch } from "./grid-search";
import { simulateStrategy } from "./simulator";
import type {
  BacktestBar,
  BacktestHorizon,
  BacktestMetrics,
  BacktestSignalFamily,
  EquityPoint,
  IndicatorParams,
  WalkForwardAdvancedReport,
  WalkForwardFold,
} from "./types";

function emptyMetrics(): BacktestMetrics {
  return {
    sharpe: null,
    sortino: null,
    maxDrawdownPct: null,
    winRate: null,
    profitFactor: null,
    tradeCount: 0,
    totalReturnPct: null,
    expectancy: 0,
  };
}

/** Compound OOS equity paths fold-by-fold into one analysis curve. */
function stitchEquityFromSims(
  foldSims: readonly { equityCurve: readonly EquityPoint[] }[],
  start = 100_000,
): EquityPoint[] {
  const out: EquityPoint[] = [{ index: 0, equity: start }];
  let equity = start;
  let idx = 1;
  for (const sim of foldSims) {
    for (let i = 1; i < sim.equityCurve.length; i += 1) {
      const prev = sim.equityCurve[i - 1]!.equity;
      const cur = sim.equityCurve[i]!.equity;
      const ret = prev > 0 ? cur / prev - 1 : 0;
      equity = equity * (1 + ret);
      out.push({ index: idx++, equity, date: sim.equityCurve[i]?.date });
    }
  }
  return out;
}

export function runWalkForward(input: {
  readonly bars: readonly BacktestBar[];
  readonly family: BacktestSignalFamily;
  readonly horizon?: BacktestHorizon;
  /** Train window length in bars. */
  readonly trainSize?: number;
  /** Test (OOS) window length in bars. */
  readonly testSize?: number;
  /** Step between successive fold starts. */
  readonly stepSize?: number;
  readonly maxFolds?: number;
}): WalkForwardAdvancedReport {
  const n = input.bars.length;
  const trainSize = Math.min(
    Math.max(input.trainSize ?? Math.floor(n * 0.35), 60),
    Math.floor(n * 0.7),
  );
  const testSize = Math.min(
    Math.max(input.testSize ?? Math.floor(n * 0.15), 20),
    Math.floor(n * 0.35),
  );
  const stepSize = Math.min(Math.max(input.stepSize ?? testSize, 10), testSize);
  const maxFolds = Math.min(Math.max(input.maxFolds ?? 8, 1), 16);

  const folds: WalkForwardFold[] = [];
  const foldSims: { equityCurve: readonly EquityPoint[] }[] = [];

  if (n < trainSize + testSize) {
    return {
      folds: [],
      aggregateOos: emptyMetrics(),
      equityCurve: [],
      bestOverallParams: null,
      family: input.family,
      note: `NO_DATA — need ≥${trainSize + testSize} bars for walk-forward; have ${n}.`,
    };
  }

  for (
    let trainStart = 0;
    trainStart + trainSize + testSize <= n && folds.length < maxFolds;
    trainStart += stepSize
  ) {
    const trainEnd = trainStart + trainSize;
    const testStart = trainEnd;
    const testEnd = testStart + testSize;
    const trainBars = input.bars.slice(trainStart, trainEnd);
    const testBars = input.bars.slice(testStart, testEnd);

    const grid = runGridSearch({
      bars: trainBars,
      family: input.family,
      horizon: input.horizon,
      maxTrials: 24,
    });
    const bestParams: IndicatorParams = grid.best?.params ?? {};
    const isSim = simulateStrategy({
      bars: trainBars,
      family: input.family,
      params: bestParams,
      horizon: input.horizon,
    });
    const oosSim = simulateStrategy({
      bars: testBars,
      family: input.family,
      params: bestParams,
      horizon: input.horizon,
    });

    folds.push({
      foldIndex: folds.length,
      trainStart,
      trainEnd,
      testStart,
      testEnd,
      bestParams,
      family: input.family,
      inSample: isSim.metrics,
      outOfSample: oosSim.metrics,
      oosEquity: oosSim.equityCurve,
    });
    foldSims.push({ equityCurve: oosSim.equityCurve });
  }

  const allOosTrades = folds.flatMap((f) =>
    simulateStrategy({
      bars: input.bars.slice(f.testStart, f.testEnd),
      family: input.family,
      params: f.bestParams,
      horizon: input.horizon,
    }).trades,
  );

  const equityCurve = stitchEquityFromSims(foldSims);
  const periodReturns: number[] = [];
  for (let i = 1; i < equityCurve.length; i += 1) {
    const prev = equityCurve[i - 1]!.equity;
    const cur = equityCurve[i]!.equity;
    if (prev > 0) periodReturns.push(cur / prev - 1);
  }

  const aggregateOos = computeBacktestMetrics(allOosTrades, equityCurve, periodReturns, {
    periodsPerYear: input.horizon === "intraday" ? 252 * 78 : 252,
  });

  const bestOverall =
    folds.length === 0
      ? null
      : [...folds].sort(
          (a, b) => scoreMetrics(b.outOfSample) - scoreMetrics(a.outOfSample),
        )[0]!.bestParams;

  return {
    folds,
    aggregateOos,
    equityCurve,
    bestOverallParams: bestOverall,
    family: input.family,
    note: `Walk-forward ${folds.length} fold(s) · train=${trainSize} test=${testSize} step=${stepSize}. Params fit in-sample only; metrics reported out-of-sample. ANALYSIS_ONLY.`,
  };
}
