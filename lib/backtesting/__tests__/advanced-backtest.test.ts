/**
 * Pure unit coverage for advanced backtesting (no network).
 */

import { describe, expect, it } from "vitest";
import { buildParamGrid, runGridSearch } from "@/lib/backtesting/grid-search";
import { computeBacktestMetrics, scoreMetrics } from "@/lib/backtesting/metrics";
import { simulateStrategy } from "@/lib/backtesting/simulator";
import { buildSignalSeries } from "@/lib/backtesting/signals";
import { runWalkForward } from "@/lib/backtesting/walk-forward";
import type { BacktestBar } from "@/lib/backtesting/types";

function synthBars(n = 200): BacktestBar[] {
  let price = 100;
  const bars: BacktestBar[] = [];
  for (let i = 0; i < n; i += 1) {
    const r = Math.sin(i / 8) * 0.012 + (i % 11 === 0 ? -0.02 : 0.004);
    const open = price;
    const close = Number((price * (1 + r)).toFixed(4));
    bars.push({
      open,
      high: Math.max(open, close) * 1.005,
      low: Math.min(open, close) * 0.995,
      close,
      volume: 1_000_000,
      date: new Date(Date.UTC(2021, 0, 1 + i)).toISOString(),
    });
    price = close;
  }
  return bars;
}

describe("lib/backtesting advanced suite", () => {
  it("simulates RSI with metrics and equity curve", () => {
    const bars = synthBars(180);
    const sim = simulateStrategy({ bars, family: "rsi", horizon: "swing" });
    expect(sim.note).toContain("ANALYSIS_ONLY");
    expect(sim.equityCurve.length).toBeGreaterThan(10);
    expect(sim.metrics.tradeCount).toBeGreaterThanOrEqual(0);
    const scored = scoreMetrics(sim.metrics);
    expect(Number.isFinite(scored)).toBe(true);
  });

  it("builds RSI/MACD/Bollinger signal series", () => {
    const bars = synthBars(120);
    expect(buildSignalSeries(bars, "rsi", { rsiPeriod: 14 }).length).toBe(120);
    expect(buildSignalSeries(bars, "macd", {}).length).toBe(120);
    expect(buildSignalSeries(bars, "bollinger", { bbPeriod: 20 }).length).toBe(120);
  });

  it("grid-searches RSI params", () => {
    const bars = synthBars(160);
    const grid = runGridSearch({ bars, family: "rsi", horizon: "swing", maxTrials: 12 });
    expect(grid.trials.length).toBeGreaterThan(0);
    expect(grid.best).not.toBeNull();
    expect(buildParamGrid("bollinger").length).toBeGreaterThan(0);
  });

  it("walk-forward fits in-sample and reports OOS", () => {
    const bars = synthBars(220);
    const wf = runWalkForward({
      bars,
      family: "rsi",
      horizon: "swing",
      trainSize: 80,
      testSize: 30,
      stepSize: 30,
      maxFolds: 3,
    });
    expect(wf.folds.length).toBeGreaterThan(0);
    expect(wf.note).toContain("out-of-sample");
    expect(wf.equityCurve.length).toBeGreaterThan(1);
    const m = computeBacktestMetrics([], [{ index: 0, equity: 100 }], []);
    expect(m.tradeCount).toBe(0);
  });
});
