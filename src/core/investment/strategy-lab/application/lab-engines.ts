/**
 * Strategy Lab research engines — Monte Carlo, optimizer, portfolio tester,
 * benchmark compare, AI proposals / improvements. Analysis-only.
 */

import type {
  StrategyLabAiImprovement,
  StrategyLabAiProposal,
  StrategyLabComparisonRow,
  StrategyLabMetrics,
  StrategyLabTradeSample,
} from "../domain/types";
import { computeStrategyLabMetrics, demoTradeSamplesForStrategy } from "./metrics";

export type MonteCarloResult = {
  readonly strategyId: string;
  readonly simulations: number;
  readonly medianFinalEquity: number;
  readonly p5FinalEquity: number;
  readonly p95FinalEquity: number;
  readonly medianMaxDrawdownPct: number | null;
  readonly ruinProbability: number;
  readonly note: string;
};

export type OptimizerTrial = {
  readonly params: Readonly<Record<string, number>>;
  readonly score: number;
  readonly metrics: StrategyLabMetrics;
};

export type OptimizerResult = {
  readonly strategyId: string;
  readonly trials: readonly OptimizerTrial[];
  readonly best: OptimizerTrial | null;
  readonly note: string;
};

export type PortfolioTesterResult = {
  readonly strategyId: string;
  readonly portfolios: readonly {
    readonly portfolioId: string;
    readonly label: string;
    readonly metrics: StrategyLabMetrics;
  }[];
  readonly note: string;
};

function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleCopy<T>(items: readonly T[], rand: () => number): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  return arr;
}

export function runMonteCarloSimulation(input: {
  readonly strategyId: string;
  readonly trades: readonly StrategyLabTradeSample[];
  readonly simulations?: number;
  readonly startingEquity?: number;
  readonly seed?: number;
}): MonteCarloResult {
  const sims = Math.min(Math.max(input.simulations ?? 200, 20), 2000);
  const start = input.startingEquity ?? 100_000;
  const rand = mulberry32(input.seed ?? 42);
  const finals: number[] = [];
  const drawdowns: number[] = [];
  let ruin = 0;

  for (let s = 0; s < sims; s++) {
    const path = shuffleCopy(input.trades, rand);
    let equity = start;
    let peak = start;
    let maxDd = 0;
    for (const t of path) {
      equity += t.pnl - t.commission;
      if (equity > peak) peak = equity;
      if (peak > 0) maxDd = Math.max(maxDd, ((peak - equity) / peak) * 100);
    }
    if (equity <= start * 0.5) ruin += 1;
    finals.push(equity);
    drawdowns.push(maxDd);
  }

  finals.sort((a, b) => a - b);
  drawdowns.sort((a, b) => a - b);
  const pct = (arr: number[], p: number) => {
    if (arr.length === 0) return 0;
    const idx = Math.min(arr.length - 1, Math.max(0, Math.floor((p / 100) * arr.length)));
    return arr[idx]!;
  };

  return {
    strategyId: input.strategyId,
    simulations: sims,
    medianFinalEquity: pct(finals, 50),
    p5FinalEquity: pct(finals, 5),
    p95FinalEquity: pct(finals, 95),
    medianMaxDrawdownPct: drawdowns.length ? pct(drawdowns, 50) : null,
    ruinProbability: sims === 0 ? 0 : ruin / sims,
    note: "Bootstrap reshuffle of lab trade samples — not live order simulation.",
  };
}

export function runParameterOptimizer(input: {
  readonly strategyId: string;
  readonly baseTrades: readonly StrategyLabTradeSample[];
  readonly paramGrid?: ReadonlyArray<Readonly<Record<string, number>>>;
}): OptimizerResult {
  const grid =
    input.paramGrid ??
    ([
      { lookback: 10, threshold: 0.5 },
      { lookback: 20, threshold: 0.5 },
      { lookback: 20, threshold: 0.7 },
      { lookback: 40, threshold: 0.6 },
      { lookback: 15, threshold: 0.4 },
    ] as const);

  const trials: OptimizerTrial[] = grid.map((params) => {
    const scale = 0.85 + (params.lookback ?? 20) / 100 + (params.threshold ?? 0.5) * 0.2;
    const scaled: StrategyLabTradeSample[] = input.baseTrades.map((t) => ({
      ...t,
      pnl: Math.round(t.pnl * scale * 100) / 100,
    }));
    const metrics = computeStrategyLabMetrics(scaled);
    const score =
      (metrics.sharpe ?? 0) * 0.4 +
      (metrics.profitFactor ?? 0) * 0.3 +
      metrics.expectancy * 0.01 -
      (metrics.maxDrawdownPct ?? 0) * 0.01;
    return { params, score, metrics };
  });

  trials.sort((a, b) => b.score - a.score);
  return {
    strategyId: input.strategyId,
    trials,
    best: trials[0] ?? null,
    note: "Parameter grid search on scaled DEMO/lab samples. Does not mutate production strategies.",
  };
}

export function runPortfolioTester(input: {
  readonly strategyId: string;
  readonly baseTrades: readonly StrategyLabTradeSample[];
}): PortfolioTesterResult {
  const portfolios = [
    { portfolioId: "concentrated", label: "Concentrated (3 names)", scale: 1.15 },
    { portfolioId: "balanced", label: "Balanced (8 names)", scale: 1 },
    { portfolioId: "diversified", label: "Diversified (20 names)", scale: 0.88 },
  ] as const;

  return {
    strategyId: input.strategyId,
    portfolios: portfolios.map((p) => ({
      portfolioId: p.portfolioId,
      label: p.label,
      metrics: computeStrategyLabMetrics(
        input.baseTrades.map((t) => ({
          ...t,
          pnl: Math.round(t.pnl * p.scale * 100) / 100,
          riskPct: (t.riskPct ?? 1) / Math.sqrt(p.portfolioId === "diversified" ? 20 : p.portfolioId === "balanced" ? 8 : 3),
        })),
      ),
    })),
    note: "Cross-portfolio sensitivity on lab samples — ANALYSIS_ONLY.",
  };
}

export function compareMetrics(
  leftLabel: string,
  left: StrategyLabMetrics,
  rightLabel: string,
  right: StrategyLabMetrics,
): StrategyLabComparisonRow[] {
  const keys: Array<keyof StrategyLabMetrics> = [
    "cagr",
    "sharpe",
    "sortino",
    "calmar",
    "profitFactor",
    "expectancy",
    "winRate",
    "maxDrawdownPct",
    "ulcerIndex",
    "recoveryFactor",
    "volatility",
    "tradeCount",
  ];

  const lowerIsBetter = new Set(["maxDrawdownPct", "ulcerIndex", "volatility", "averageLoss"]);

  return keys.map((metric) => {
    const leftValue = left[metric] as number | null;
    const rightValue = right[metric] as number | null;
    if (leftValue === null || rightValue === null) {
      return {
        left: leftLabel,
        right: rightLabel,
        metric,
        leftValue,
        rightValue,
        delta: null,
        winner: "insufficient" as const,
      };
    }
    const delta = leftValue - rightValue;
    let winner: StrategyLabComparisonRow["winner"] = "tie";
    if (Math.abs(delta) > 1e-9) {
      if (lowerIsBetter.has(metric)) winner = delta < 0 ? "left" : "right";
      else winner = delta > 0 ? "left" : "right";
    }
    return { left: leftLabel, right: rightLabel, metric, leftValue, rightValue, delta, winner };
  });
}

export function generateAiStrategyProposals(strategyIds: readonly string[]): StrategyLabAiProposal[] {
  const pairs = [
    ["momentum", "trend-following"],
    ["mean-reversion", "low-volatility"],
    ["quality", "value"],
    ["relative-strength", "sector-rotation"],
  ] as const;

  return pairs.map(([a, b], i) => {
    const available = strategyIds.filter((id) => id === a || id === b);
    const bases = available.length >= 2 ? available : strategyIds.slice(0, 2);
    return {
      id: `ai-proposal-${i + 1}`,
      name: `Hybrid ${a} × ${b}`,
      description: `AI-proposed blend of ${a} and ${b} with regime filter and risk budget. Draft only — requires lab validation.`,
      baseStrategies: bases.length ? bases : [a, b],
      markets: ["usa-equities", "etf", "europe-equities"],
      confidence: 0.42 + i * 0.05,
      status: "draft_proposal" as const,
    };
  });
}

export function proposeAiImprovements(
  strategyId: string,
  metrics: StrategyLabMetrics,
  version: string,
): StrategyLabAiImprovement[] {
  const improvements: StrategyLabAiImprovement[] = [];
  const now = new Date().toISOString();

  if ((metrics.maxDrawdownPct ?? 0) > 15) {
    improvements.push({
      id: `${strategyId}-imp-dd`,
      strategyId,
      versionTarget: version,
      proposedAt: now,
      summary: "Tighten risk-per-trade and add volatility targeting",
      rationale: `Observed max drawdown ${metrics.maxDrawdownPct?.toFixed(2)}% exceeds lab comfort band.`,
      expectedImpact: "Lower ulcer index; possibly lower CAGR",
      status: "proposed",
      mutatesProduction: false,
    });
  }

  if ((metrics.sharpe ?? 0) < 0.6) {
    improvements.push({
      id: `${strategyId}-imp-sharpe`,
      strategyId,
      versionTarget: version,
      proposedAt: now,
      summary: "Filter low-liquidity entries; raise conviction threshold",
      rationale: `Sharpe ${metrics.sharpe} below research target 0.6.`,
      expectedImpact: "Fewer trades, higher quality expectancy",
      status: "pending_validation",
      mutatesProduction: false,
    });
  }

  if (metrics.expectancy <= 0) {
    improvements.push({
      id: `${strategyId}-imp-exp`,
      strategyId,
      versionTarget: version,
      proposedAt: now,
      summary: "Disable adverse regimes; re-run walk-forward",
      rationale: `Negative/zero expectancy ${metrics.expectancy}.`,
      expectedImpact: "Restore positive expectancy before paper promotion",
      status: "proposed",
      mutatesProduction: false,
    });
  }

  if (improvements.length === 0) {
    improvements.push({
      id: `${strategyId}-imp-maintain`,
      strategyId,
      versionTarget: version,
      proposedAt: now,
      summary: "Maintain parameters; extend sample across sessions",
      rationale: "Core metrics within research band; sample depth is the bottleneck.",
      expectedImpact: "Certification sample readiness",
      status: "proposed",
      mutatesProduction: false,
    });
  }

  return improvements;
}

export function buildBenchmarkMetrics(label: "SPY" | "EQUAL_WEIGHT" | "CASH"): StrategyLabMetrics {
  const samples = demoTradeSamplesForStrategy(`benchmark-${label}`, label === "SPY" ? 7 : label === "CASH" ? 3 : 11);
  if (label === "CASH") {
    return computeStrategyLabMetrics(
      samples.map((t) => ({ ...t, pnl: 2, commission: 0, mae: 0, mfe: 2 })),
    );
  }
  return computeStrategyLabMetrics(samples);
}
