/**
 * Alpha Engine domain — discover, score, prioritize opportunities.
 * Never places orders. Only A+/A may escalate to Committee / Risk (analysis).
 */

export const ALPHA_GRADES = ["A+", "A", "B", "C", "D", "REJECTED"] as const;
export type AlphaGrade = (typeof ALPHA_GRADES)[number];

export const ALPHA_DIRECTIONS = ["long", "short", "neutral"] as const;
export type AlphaDirection = (typeof ALPHA_DIRECTIONS)[number];

export const ALPHA_MARKETS = [
  "stocks",
  "etf",
  "forex",
  "indices",
  "futures",
  "options",
  "bonds",
  "commodities",
  "crypto",
] as const;
export type AlphaMarket = (typeof ALPHA_MARKETS)[number];

export const ALPHA_REJECT_REASONS = [
  "delayed-data",
  "non-real-data",
  "missing-bid-ask",
  "spread-excessive",
  "insufficient-liquidity",
  "market-closed",
  "contract-unresolved",
  "risk-exceeds-limits",
  "signal-expired",
  "duplicate",
  "cooldown-active",
  "open-position-conflict",
  "low-score",
  "stale-data",
] as const;
export type AlphaRejectReason = (typeof ALPHA_REJECT_REASONS)[number];

export type AlphaDataQuality = "live" | "fresh" | "aging" | "delayed" | "stale" | "demo" | "missing";

export interface AlphaScoreBreakdown {
  readonly signalQuality: number;
  readonly strategyConsensus: number;
  readonly agentConsensus: number;
  readonly marketContext: number;
  readonly risk: number;
  readonly liquidity: number;
  readonly spread: number;
  readonly portfolioCorrelation: number;
  readonly valuation: number;
  readonly trend: number;
  readonly fundamentals: number;
  readonly news: number;
  readonly macro: number;
  readonly sentiment: number;
  readonly dataFreshness: number;
  readonly total: number;
}

export interface AlphaOpportunity {
  readonly id: string;
  readonly asset: string;
  readonly market: AlphaMarket;
  readonly direction: AlphaDirection;
  readonly strategy: string;
  readonly strategiesAgreeing: readonly string[];
  readonly agentsAgreeing: readonly string[];
  readonly timeHorizon: string;
  readonly entryEstimated: number | null;
  readonly stop: number | null;
  readonly target: number | null;
  readonly expectedReturnPct: number | null;
  readonly expectedRiskPct: number | null;
  readonly spread: number | null;
  readonly estimatedSlippage: number | null;
  readonly liquidity: number | null;
  readonly dataQuality: AlphaDataQuality;
  readonly confidence: number;
  readonly evidence: readonly string[];
  readonly sources: readonly string[];
  readonly portfolioImpact: string;
  readonly expiresAt: string;
  readonly detectedAt: string;
  readonly score: number;
  readonly scoreBreakdown: AlphaScoreBreakdown;
  readonly grade: AlphaGrade;
  readonly status: "top" | "rejected" | "ranked";
  readonly whyDetected: string;
  readonly risks: readonly string[];
  readonly thesisInvalidation: readonly string[];
  readonly acceptOrRejectReason: string;
  readonly rejectReasons: readonly AlphaRejectReason[];
  readonly escalateToCommittee: boolean;
  readonly escalateToRisk: boolean;
  readonly analysisOnly: true;
  readonly orderExecution: "disabled";
}

export interface AlphaPostTradeReview {
  readonly opportunityId: string;
  readonly asset: string;
  readonly strategy: string;
  readonly predictedEntry: number | null;
  readonly actualEntry: number | null;
  readonly predictedExit: number | null;
  readonly actualExit: number | null;
  readonly expectedReturnPct: number | null;
  readonly actualReturnPct: number | null;
  readonly expectedRiskPct: number | null;
  readonly actualRiskPct: number | null;
  readonly slippage: number | null;
  readonly timingError: number | null;
  readonly thesisError: string | null;
  readonly committeeAccuracy: number | null;
  readonly strategyAccuracy: number | null;
  readonly learningProposal: string;
  readonly mutatesProduction: false;
  readonly nextValidationPath: readonly [
    "backtesting",
    "walk-forward",
    "paper-trading",
    "shadow-trading",
    "certification",
  ];
}

export interface AlphaLearningProposal {
  readonly id: string;
  readonly opportunityId: string;
  readonly summary: string;
  readonly rationale: string;
  readonly status: "proposed";
  readonly mutatesProduction: false;
  readonly mustRevalidateVia: readonly string[];
}

export const ALPHA_MEMORY_SCENARIO = "alpha-engine" as const;

export const ALPHA_COOLDOWN_MS_DEFAULT = 15 * 60 * 1000;
