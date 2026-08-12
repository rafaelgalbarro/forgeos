/**
 * Strategy Lab domain — quantitative research / validation surface.
 * Never submits orders. Production strategies are never auto-mutated.
 */

import type {
  StrategyCompatibleMarket,
  StrategyHistoricalPerformanceLevel,
  StrategyId,
  StrategyTimeHorizonMeta,
} from "../../strategy/domain/types";

export const STRATEGY_LAB_SECTIONS = [
  "library",
  "builder",
  "backtesting",
  "walk-forward",
  "monte-carlo",
  "optimizer",
  "portfolio-tester",
  "benchmark",
  "ai-generator",
  "performance-ranking",
  "ai-improvements",
  "certification",
  "compare",
] as const;

export type StrategyLabSectionId = (typeof STRATEGY_LAB_SECTIONS)[number];

export type StrategyLabLifecycleStatus =
  | "draft"
  | "research"
  | "backtested"
  | "walk_forward"
  | "paper"
  | "shadow"
  | "certified"
  | "production_candidate"
  | "rejected"
  | "archived";

export type StrategyLabCertificationVerdict =
  | "PASS"
  | "FAIL"
  | "INSUFFICIENT_SAMPLE"
  | "BLOCKED_LIVE";

export type StrategyLabMetricsSource = "BACKTEST" | "PAPER" | "SHADOW" | "LIVE" | "DEMO";

export type StrategyLabMetricsLabel = StrategyLabMetricsSource | "INSUFFICIENT_SAMPLE";

export type StrategyLabMetricsConfidence = "LOW" | "MEDIUM" | "HIGH";

export type StrategyLabVersionStatus = "active_lab" | "superseded" | "production_locked";

export interface StrategyLabTradeSample {
  readonly pnl: number;
  readonly commission: number;
  readonly mae?: number;
  readonly mfe?: number;
  readonly holdingPeriodHours?: number;
  readonly riskPct?: number;
}

export interface StrategyLabMetrics {
  readonly annualizedReturn: number | null;
  readonly cagr: number | null;
  readonly sharpe: number | null;
  readonly sortino: number | null;
  readonly calmar: number | null;
  readonly profitFactor: number | null;
  readonly expectancy: number;
  readonly winRate: number | null;
  readonly averageWin: number;
  readonly averageLoss: number;
  readonly mae: number | null;
  readonly mfe: number | null;
  readonly maxDrawdownPct: number | null;
  readonly ulcerIndex: number | null;
  readonly recoveryFactor: number | null;
  readonly volatility: number | null;
  readonly tradeCount: number;
  readonly avgTimeInMarketHours: number | null;
  readonly riskPerTradePct: number | null;
  readonly totalRiskPct: number | null;
}

export interface StrategyLabRecord {
  readonly strategyId: StrategyId | string;
  readonly name: string;
  readonly description: string;
  readonly compatibleMarkets: readonly StrategyCompatibleMarket[] | readonly string[];
  readonly compatibleAssets: readonly string[];
  readonly timeHorizon: StrategyTimeHorizonMeta | string;
  readonly idealConditions: readonly string[];
  readonly unfavorableConditions: readonly string[];
  readonly risk: readonly string[];
  readonly recommendedCapital: number | null;
  readonly historicalMetrics: StrategyLabMetrics;
  readonly metricsSource: StrategyLabMetricsSource;
  readonly metricsLabel: StrategyLabMetricsLabel;
  readonly sampleSize: number;
  readonly sessions: number;
  readonly dataSource: string;
  readonly period: string | null;
  readonly costsIncluded: boolean;
  readonly slippageIncluded: boolean;
  readonly metricsConfidence: StrategyLabMetricsConfidence;
  readonly readiness: "NOT_READY";
  readonly productionRankingEligible: boolean;
  readonly status: StrategyLabLifecycleStatus;
  readonly version: string;
  readonly historicalPerformanceLevel: StrategyHistoricalPerformanceLevel | string;
  readonly currentConfidence: number | null;
  readonly enabled: boolean;
}

export interface StrategyLabVersionEntry {
  readonly strategyId: string;
  readonly version: string;
  readonly createdAt: string;
  readonly parentVersion: string | null;
  readonly changeSummary: string;
  readonly status: StrategyLabVersionStatus;
  readonly metrics: StrategyLabMetrics;
  readonly productionMutable: false;
}

export interface StrategyLabCertificationCriterion {
  readonly id: string;
  readonly label: string;
  readonly passed: boolean;
  readonly evidence: string;
}

export interface StrategyLabCertificationResult {
  readonly strategyId: string;
  readonly version: string;
  readonly verdict: StrategyLabCertificationVerdict;
  readonly readiness: "NOT_READY";
  readonly criteria: readonly StrategyLabCertificationCriterion[];
  readonly livePromotionAllowed: false;
  readonly note: string;
}

export interface StrategyLabComparisonRow {
  readonly left: string;
  readonly right: string;
  readonly metric: string;
  readonly leftValue: number | null;
  readonly rightValue: number | null;
  readonly delta: number | null;
  readonly winner: "left" | "right" | "tie" | "insufficient";
}

export interface StrategyLabAiImprovement {
  readonly id: string;
  readonly strategyId: string;
  readonly versionTarget: string;
  readonly proposedAt: string;
  readonly summary: string;
  readonly rationale: string;
  readonly expectedImpact: string;
  readonly status: "proposed" | "pending_validation" | "approved_lab" | "rejected";
  readonly mutatesProduction: false;
}

export interface StrategyLabAiProposal {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly baseStrategies: readonly string[];
  readonly markets: readonly string[];
  readonly confidence: number;
  readonly status: "draft_proposal";
}

export const STRATEGY_LAB_MEMORY_SCENARIO = "strategy-lab" as const;
