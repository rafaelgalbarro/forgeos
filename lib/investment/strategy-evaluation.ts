import "server-only";

import { createDefaultStrategyEngine } from "@/src/core/investment/strategy";
import type {
  StrategyAnalysis,
  StrategyMarketContext,
  StrategyRegime,
} from "@/src/core/investment/strategy/domain/types";

export type StrategyEvaluationRow = {
  readonly strategyId: string;
  readonly name: string;
  readonly bias: string;
  readonly score: number | null;
  readonly summary: string;
  readonly hasEntryIntent: boolean;
};

export type StrategyEvaluationSnapshot = {
  readonly generatedAt: string;
  readonly mode: "ANALYSIS_ONLY";
  readonly orderExecution: "disabled";
  readonly strategyReadiness: "NOT_READY";
  readonly autonomousLive: "LOCKED";
  readonly dataLabel: "DEMO";
  readonly symbol: string;
  readonly regime: StrategyRegime;
  readonly rows: readonly StrategyEvaluationRow[];
  readonly note: string;
};

function demoContext(symbol: string, regime: StrategyRegime): StrategyMarketContext {
  return {
    symbol,
    price: 100,
    bid: 99.95,
    ask: 100.05,
    volume: 1_000_000,
    averageVolume: 900_000,
    returns: [0.01, 0.008, -0.002, 0.004, 0.006],
    smaFast: 101,
    smaSlow: 98,
    rsi: 55,
    atr: 2.1,
    volatility: 0.2,
    beta: 1,
    peRatio: 20,
    pbRatio: 3,
    roe: 15,
    earningsGrowth: 8,
    dividendYield: 1.2,
    qualityScore: 0.7,
    regime,
    capturedAt: new Date().toISOString(),
  };
}

/**
 * Offline strategy evaluation harness — DEMO market context only.
 * Emits analysis/intents; never touches broker; readiness stays NOT_READY.
 */
export function evaluateStrategiesOffline(options?: {
  readonly symbol?: string;
  readonly regime?: StrategyRegime;
}): StrategyEvaluationSnapshot {
  const symbol = (options?.symbol ?? "DEMO").toUpperCase();
  const regime = options?.regime ?? "bullish";
  const engine = createDefaultStrategyEngine();
  const ctx = demoContext(symbol, regime);
  const analyses: readonly StrategyAnalysis[] = engine.analyzeAll(ctx);
  const metaById = new Map(engine.listMetadata().map((m) => [m.strategyId, m]));

  const rows: StrategyEvaluationRow[] = analyses.map((analysis) => {
    const entry = engine.generateEntry(analysis.strategyId, ctx, analysis);
    const meta = metaById.get(analysis.strategyId);
    return {
      strategyId: analysis.strategyId,
      name: meta?.name ?? analysis.strategyId,
      bias: analysis.bias ?? "NO_DATA",
      score: typeof analysis.score === "number" ? analysis.score : null,
      summary: analysis.summary ?? "NO_DATA",
      hasEntryIntent: entry != null,
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    mode: "ANALYSIS_ONLY",
    orderExecution: "disabled",
    strategyReadiness: "NOT_READY",
    autonomousLive: "LOCKED",
    dataLabel: "DEMO",
    symbol,
    regime,
    rows,
    note: "DEMO market context — offline harness only. No broker calls. Go-live remains NOT_READY.",
  };
}
