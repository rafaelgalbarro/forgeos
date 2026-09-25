/**
 * Strategy Lab orchestrator — composes Strategy Engine, metrics, certification,
 * versioning, and research engines into one ANALYSIS_ONLY snapshot.
 */

import { createDefaultStrategyEngine, getStrategyActivationStore } from "../../strategy";
import type {
  StrategyLabRecord,
  StrategyLabMetricsSource,
  StrategyLabSectionId,
  StrategyLabTradeSample,
} from "../domain/types";
import { STRATEGY_LAB_SECTIONS } from "../domain/types";
import { evaluateStrategyLabCertification } from "./certification";
import {
  buildBenchmarkMetrics,
  compareMetrics,
  generateAiStrategyProposals,
  proposeAiImprovements,
  runMonteCarloSimulation,
  runParameterOptimizer,
  runPortfolioTester,
} from "./lab-engines";
import { computeStrategyLabMetrics, demoTradeSamplesForStrategy } from "./metrics";
import { getStrategyLabVersionStore } from "./versioning";

export type StrategyLabTradeSource = {
  readonly label: StrategyLabMetricsSource;
  readonly byStrategy: ReadonlyMap<string, readonly StrategyLabTradeSample[]>;
  readonly distinctSessions: number;
};

export type StrategyLabSafetyStamp = {
  readonly mode: "ANALYSIS_ONLY";
  readonly orderExecution: "disabled";
  readonly strategyReadiness: "NOT_READY";
  readonly autonomousLive: "LOCKED";
  readonly goLive: "NOT_READY_FOR_LIVE";
  readonly liveTradingEnabled: false;
  readonly productionMutation: "forbidden";
};

export type StrategyLabSnapshot = StrategyLabSafetyStamp & {
  readonly generatedAt: string;
  readonly tradeDataLabel: StrategyLabMetricsSource;
  readonly distinctSessions: number;
  readonly sections: readonly StrategyLabSectionId[];
  readonly library: readonly StrategyLabRecord[];
  readonly ranking: readonly {
    readonly rank: number;
    readonly strategyId: string;
    readonly name: string;
    readonly score: number;
    readonly sharpe: number | null;
    readonly expectancy: number;
    readonly maxDrawdownPct: number | null;
    readonly metricsSource: StrategyLabMetricsSource;
    readonly metricsLabel: StrategyLabRecord["metricsLabel"];
    readonly sampleSize: number;
    readonly sessions: number;
    readonly dataSource: string;
    readonly period: string | null;
    readonly costsIncluded: boolean;
    readonly slippageIncluded: boolean;
    readonly confidence: StrategyLabRecord["metricsConfidence"];
    readonly readiness: "NOT_READY";
    readonly productionRankingEligible: boolean;
  }[];
  readonly certifications: ReturnType<typeof evaluateStrategyLabCertification>[];
  readonly versions: ReturnType<ReturnType<typeof getStrategyLabVersionStore>["listAll"]>;
  readonly monteCarlo: ReturnType<typeof runMonteCarloSimulation>[];
  readonly optimizer: ReturnType<typeof runParameterOptimizer>[];
  readonly portfolioTests: ReturnType<typeof runPortfolioTester>[];
  readonly benchmarks: {
    readonly strategyId: string;
    readonly vsSpy: ReturnType<typeof compareMetrics>;
    readonly vsEqualWeight: ReturnType<typeof compareMetrics>;
    readonly vsCash: ReturnType<typeof compareMetrics>;
  }[];
  readonly comparisons: {
    readonly strategyAvsB: ReturnType<typeof compareMetrics> | null;
    readonly strategyVsPortfolio: ReturnType<typeof compareMetrics> | null;
    readonly strategyVsAi: ReturnType<typeof compareMetrics> | null;
  };
  readonly aiProposals: ReturnType<typeof generateAiStrategyProposals>;
  readonly aiImprovements: ReturnType<typeof proposeAiImprovements>[];
  readonly builder: {
    readonly note: string;
    readonly templates: readonly string[];
    readonly mutatesCore: false;
  };
  readonly integrations: Readonly<Record<string, string>>;
  readonly note: string;
};

function scoreMetrics(m: ReturnType<typeof computeStrategyLabMetrics>): number {
  return (
    (m.sharpe ?? 0) * 40 +
    (m.profitFactor ?? 0) * 20 +
    m.expectancy * 0.05 -
    (m.maxDrawdownPct ?? 0) * 0.5 +
    (m.calmar ?? 0) * 10
  );
}

function resolveTrades(
  strategyId: string,
  tradeSource?: StrategyLabTradeSource,
): { trades: StrategyLabTradeSample[]; label: StrategyLabMetricsSource } {
  const supplied = tradeSource?.byStrategy.get(strategyId);
  if (supplied && supplied.length > 0) {
    return { trades: [...supplied], label: tradeSource?.label ?? "DEMO" };
  }
  return { trades: demoTradeSamplesForStrategy(strategyId), label: "DEMO" };
}

function dataSourceFor(source: StrategyLabMetricsSource): string {
  switch (source) {
    case "DEMO":
      return "deterministic synthetic trade samples";
    case "PAPER":
      return "paper closed-trade ledger";
    case "SHADOW":
      return "shadow observation ledger";
    case "BACKTEST":
      return "backtest trade results";
    case "LIVE":
      return "live closed-trade ledger";
  }
}

export function buildStrategyLabSnapshot(options?: {
  readonly focusStrategyId?: string;
  readonly compareWithStrategyId?: string;
  readonly tradeSource?: StrategyLabTradeSource;
}): StrategyLabSnapshot {
  const engine = createDefaultStrategyEngine();
  const activation = getStrategyActivationStore();
  const versions = getStrategyLabVersionStore();
  const metadata = engine.listMetadata();
  const tradeSource = options?.tradeSource;
  const dataLabel = tradeSource?.label ?? "DEMO";
  const distinctSessions = tradeSource?.distinctSessions ?? 1;

  const library: StrategyLabRecord[] = metadata.map((m) => {
    const { trades, label: metricsSource } = resolveTrades(m.strategyId, tradeSource);
    const historicalMetrics = computeStrategyLabMetrics(trades);
    const sampleSize = historicalMetrics.tradeCount;
    const insufficientSample = sampleSize < 30;
    const sessions = metricsSource === "DEMO" ? 1 : distinctSessions;
    const productionRankingEligible = metricsSource !== "DEMO" && !insufficientSample;
    versions.seedIfEmpty(m.strategyId, m.version, historicalMetrics);
    const ver = versions.current(m.strategyId);
    return {
      strategyId: m.strategyId,
      name: m.name,
      description: m.assumptions[0] ?? m.name,
      compatibleMarkets: m.compatibleMarkets ?? [],
      compatibleAssets: m.compatibleAssets ?? ["equities", "etf"],
      timeHorizon: m.timeHorizon ?? "swing",
      idealConditions: m.idealConditions ?? m.compatibleRegimes,
      unfavorableConditions: m.unfavorableConditions ?? m.incompatibleRegimes,
      risk: m.risks,
      recommendedCapital: 25_000,
      historicalMetrics,
      metricsSource,
      metricsLabel: insufficientSample ? "INSUFFICIENT_SAMPLE" : metricsSource,
      sampleSize,
      sessions,
      dataSource: dataSourceFor(metricsSource),
      period: null,
      costsIncluded: true,
      slippageIncluded: false,
      metricsConfidence:
        metricsSource === "DEMO" || insufficientSample ? "LOW" : sampleSize >= 100 ? "HIGH" : "MEDIUM",
      readiness: "NOT_READY",
      productionRankingEligible,
      status:
        insufficientSample || metricsSource === "DEMO"
          ? "research"
          : metricsSource === "PAPER"
            ? "paper"
            : metricsSource === "SHADOW"
              ? "shadow"
              : metricsSource === "BACKTEST"
                ? "backtested"
                : "production_candidate",
      version: ver?.version ?? `${m.version}-lab`,
      historicalPerformanceLevel: m.historicalPerformanceLevel ?? "unproven",
      currentConfidence: m.currentConfidence ?? null,
      enabled: activation.isEnabled(m.strategyId),
    };
  });

  const ranking = [...library]
    .map((row) => ({
      strategyId: String(row.strategyId),
      name: row.name,
      // Raw score is research-only; production consumers must gate on productionRankingEligible.
      score: scoreMetrics(row.historicalMetrics),
      sharpe: row.historicalMetrics.sharpe,
      expectancy: row.historicalMetrics.expectancy,
      maxDrawdownPct: row.historicalMetrics.maxDrawdownPct,
      metricsSource: row.metricsSource,
      metricsLabel: row.metricsLabel,
      sampleSize: row.sampleSize,
      sessions: row.sessions,
      dataSource: row.dataSource,
      period: row.period,
      costsIncluded: row.costsIncluded,
      slippageIncluded: row.slippageIncluded,
      confidence: row.metricsConfidence,
      readiness: row.readiness,
      productionRankingEligible: row.productionRankingEligible,
    }))
    .sort((a, b) => {
      if (a.productionRankingEligible !== b.productionRankingEligible) {
        return a.productionRankingEligible ? -1 : 1;
      }
      return b.score - a.score;
    })
    .map((row, i) => ({ rank: i + 1, ...row }));

  const focusId =
    options?.focusStrategyId && library.some((r) => r.strategyId === options.focusStrategyId)
      ? options.focusStrategyId
      : ranking[0]?.strategyId ?? library[0]?.strategyId ?? "momentum";

  const focus = library.find((r) => r.strategyId === focusId) ?? library[0]!;
  const compareId =
    options?.compareWithStrategyId &&
    library.some((r) => r.strategyId === options.compareWithStrategyId)
      ? options.compareWithStrategyId
      : ranking[1]?.strategyId ?? library[1]?.strategyId ?? focusId;

  const compareRow = library.find((r) => r.strategyId === compareId) ?? focus;
  const focusTrades = resolveTrades(String(focus.strategyId), tradeSource).trades;

  const certifications = library.slice(0, 8).map((row) =>
    evaluateStrategyLabCertification({
      strategyId: String(row.strategyId),
      version: row.version,
      metrics: row.historicalMetrics,
      distinctSessions,
      goLiveDecision: "NOT_READY_FOR_LIVE",
    }),
  );

  const monteCarlo = library.slice(0, 5).map((row) =>
    runMonteCarloSimulation({
      strategyId: String(row.strategyId),
      trades: resolveTrades(String(row.strategyId), tradeSource).trades,
      simulations: 120,
    }),
  );

  const optimizer = [
    runParameterOptimizer({
      strategyId: String(focus.strategyId),
      baseTrades: focusTrades,
    }),
  ];

  const portfolioTests = [
    runPortfolioTester({
      strategyId: String(focus.strategyId),
      baseTrades: focusTrades,
    }),
  ];

  const spy = buildBenchmarkMetrics("SPY");
  const eq = buildBenchmarkMetrics("EQUAL_WEIGHT");
  const cash = buildBenchmarkMetrics("CASH");

  const benchmarks = [
    {
      strategyId: String(focus.strategyId),
      vsSpy: compareMetrics(String(focus.strategyId), focus.historicalMetrics, "SPY", spy),
      vsEqualWeight: compareMetrics(
        String(focus.strategyId),
        focus.historicalMetrics,
        "EQUAL_WEIGHT",
        eq,
      ),
      vsCash: compareMetrics(String(focus.strategyId), focus.historicalMetrics, "CASH", cash),
    },
  ];

  const portfolioProxy = portfolioTests[0]?.portfolios[1]?.metrics ?? focus.historicalMetrics;
  const aiBlend = computeStrategyLabMetrics(
    demoTradeSamplesForStrategy(`ai-blend-${focus.strategyId}`, 99),
  );

  const aiProposals = generateAiStrategyProposals(library.map((r) => String(r.strategyId)));
  const aiImprovements = library.slice(0, 6).map((row) =>
    proposeAiImprovements(String(row.strategyId), row.historicalMetrics, row.version),
  );

  return {
    generatedAt: new Date().toISOString(),
    mode: "ANALYSIS_ONLY",
    orderExecution: "disabled",
    strategyReadiness: "NOT_READY",
    autonomousLive: "LOCKED",
    goLive: "NOT_READY_FOR_LIVE",
    liveTradingEnabled: false,
    productionMutation: "forbidden",
    tradeDataLabel: dataLabel,
    distinctSessions,
    sections: STRATEGY_LAB_SECTIONS,
    library,
    ranking,
    certifications,
    versions: versions.listAll(),
    monteCarlo,
    optimizer,
    portfolioTests,
    benchmarks,
    comparisons: {
      strategyAvsB: compareMetrics(
        String(focus.strategyId),
        focus.historicalMetrics,
        String(compareRow.strategyId),
        compareRow.historicalMetrics,
      ),
      strategyVsPortfolio: compareMetrics(
        String(focus.strategyId),
        focus.historicalMetrics,
        "current-portfolio-proxy",
        portfolioProxy,
      ),
      strategyVsAi: compareMetrics(
        String(focus.strategyId),
        focus.historicalMetrics,
        "ai-proposal-blend",
        aiBlend,
      ),
    },
    aiProposals,
    aiImprovements,
    builder: {
      note: "Strategy Builder composes existing Strategy Engine templates — never patches core strategy modules in production.",
      templates: library.map((r) => String(r.strategyId)),
      mutatesCore: false,
    },
    integrations: {
      investmentBrain: "signals/intents via Strategy Engine",
      investmentCommittee: "lab ranking informs research; committee remains decision authority",
      riskEngine: "drawdown/Sharpe gates in certification",
      portfolioAnalytics: "portfolio tester + compare vs portfolio proxy",
      marketIntelligence: "backtest/walk-forward pages reuse MI bars when available",
      paperTrading: dataLabel === "PAPER" ? "metrics from paper closed trades" : "DEMO samples until paper ledger available",
      shadowTrading: "shadow after paper; still locked from live",
      liveTrading: "LOCKED — livePromotionAllowed=false",
      investmentMemory: "lab runs recorded under scenario=strategy-lab",
    },
    note: `Strategy Lab — quantitative research hub (${dataLabel} trade samples, sessions=${distinctSessions}). Versions immutable; AI never mutates production; Live remains NOT_READY_FOR_LIVE.`,
  };
}
