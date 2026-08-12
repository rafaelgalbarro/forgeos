import "server-only";

import {
  runStrategyBacktest,
  type BacktestRunSnapshot,
  type BacktestStrategyResult,
} from "@/lib/investment/backtest-runner";
import type { StrategyRegime } from "@/src/core/investment/strategy/domain/types";

export type WalkForwardWindowResult = {
  readonly windowIndex: number;
  readonly startBar: number;
  readonly endBar: number;
  readonly barCount: number;
  readonly dataLabel: "DEMO" | "MI";
  readonly results: readonly BacktestStrategyResult[];
};

export type WalkForwardReportSnapshot = {
  readonly generatedAt: string;
  readonly mode: "ANALYSIS_ONLY";
  readonly orderExecution: "disabled";
  readonly strategyReadiness: "NOT_READY";
  readonly autonomousLive: "LOCKED";
  readonly dataLabel: "DEMO" | "MI";
  readonly symbol: string;
  readonly regime: StrategyRegime;
  readonly strategyId: string | "ALL";
  readonly windowSize: number;
  readonly stepSize: number;
  readonly windowCount: number;
  readonly windows: readonly WalkForwardWindowResult[];
  readonly aggregate: {
    readonly totalEntrySignals: number;
    readonly avgScore: number | null;
    readonly strategiesEvaluated: number;
  };
  /** Score-based analysis curve across windows (not broker P&L). */
  readonly equityCurve: readonly { readonly index: number; readonly equity: number }[];
  readonly note: string;
};

/**
 * Multi-window walk-forward style report on top of Strategy Engine backtest.
 * ANALYSIS_ONLY — DEMO/MI labels preserved; never submits orders.
 */
export async function runWalkForwardBacktest(options?: {
  readonly symbol?: string;
  readonly regime?: StrategyRegime;
  readonly strategyId?: string;
  readonly windowSize?: number;
  readonly stepSize?: number;
  readonly env?: NodeJS.ProcessEnv;
}): Promise<WalkForwardReportSnapshot> {
  const windowSize = Math.min(Math.max(options?.windowSize ?? 5, 3), 20);
  const stepSize = Math.min(Math.max(options?.stepSize ?? 2, 1), windowSize);
  const base = await runStrategyBacktest({
    symbol: options?.symbol,
    regime: options?.regime,
    strategyId: options?.strategyId,
    env: options?.env,
  });

  const maxBars = base.barCount;
  const windows: WalkForwardWindowResult[] = [];

  if (maxBars < windowSize) {
    return {
      generatedAt: new Date().toISOString(),
      mode: "ANALYSIS_ONLY",
      orderExecution: "disabled",
      strategyReadiness: "NOT_READY",
      autonomousLive: "LOCKED",
      dataLabel: base.dataLabel,
      symbol: base.symbol,
      regime: base.regime,
      strategyId: base.strategyId,
      windowSize,
      stepSize,
      windowCount: 0,
      windows: [],
      aggregate: { totalEntrySignals: 0, avgScore: null, strategiesEvaluated: 0 },
      equityCurve: [],
      note: `NO_DATA — need ≥${windowSize} bars for walk-forward; have ${maxBars}. ${base.note}`,
    };
  }

  // Slice each strategy path into rolling windows (path bars are the last N of full run)
  for (let start = 0; start + windowSize <= maxBars; start += stepSize) {
    const end = start + windowSize;
    const windowResults: BacktestStrategyResult[] = base.results.map((row) => {
      const pathBars = row.path.filter((b) => b.index > start && b.index <= end);
      const entrySignals = pathBars.filter((b) => b.hasEntryIntent).length;
      const scores = pathBars.map((b) => b.score).filter((s): s is number => typeof s === "number");
      return {
        strategyId: row.strategyId,
        name: row.name,
        bars: pathBars.length,
        entrySignals,
        avgScore: scores.length ? scores.reduce((s, v) => s + v, 0) / scores.length : null,
        lastBias: pathBars.at(-1)?.bias ?? "NO_DATA",
        path: pathBars,
      };
    });

    windows.push({
      windowIndex: windows.length,
      startBar: start + 1,
      endBar: end,
      barCount: windowSize,
      dataLabel: base.dataLabel,
      results: windowResults,
    });
  }

  const allScores: number[] = [];
  let totalEntrySignals = 0;
  const equityCurve: { index: number; equity: number }[] = [];
  let equity = 100;
  for (const w of windows) {
    const windowScores: number[] = [];
    for (const r of w.results) {
      totalEntrySignals += r.entrySignals;
      if (typeof r.avgScore === "number") {
        allScores.push(r.avgScore);
        windowScores.push(r.avgScore);
      }
    }
    const windowAvg =
      windowScores.length > 0
        ? windowScores.reduce((s, v) => s + v, 0) / windowScores.length
        : 0;
    const step = Math.max(-0.05, Math.min(0.05, windowAvg * 0.05));
    equity = equity * (1 + step);
    equityCurve.push({ index: w.windowIndex + 1, equity });
  }

  return {
    generatedAt: new Date().toISOString(),
    mode: "ANALYSIS_ONLY",
    orderExecution: "disabled",
    strategyReadiness: "NOT_READY",
    autonomousLive: "LOCKED",
    dataLabel: base.dataLabel,
    symbol: base.symbol,
    regime: base.regime,
    strategyId: base.strategyId,
    windowSize,
    stepSize,
    windowCount: windows.length,
    windows,
    aggregate: {
      totalEntrySignals,
      avgScore: allScores.length
        ? allScores.reduce((s, v) => s + v, 0) / allScores.length
        : null,
      strategiesEvaluated: base.results.length,
    },
    equityCurve,
    note: `Walk-forward ${windows.length} window(s) · size=${windowSize} step=${stepSize} · data=${base.dataLabel}. Equity curve is score-based analysis (not broker P&L). Zero real orders. ${base.note}`,
  };
}

/** Re-export single-run type for page convenience */
export type { BacktestRunSnapshot };
