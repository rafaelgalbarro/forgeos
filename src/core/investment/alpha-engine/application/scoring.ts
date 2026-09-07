/**
 * Alpha score 0–100 — multi-factor composite. Pure, no broker.
 */

import type { AlphaGrade, AlphaScoreBreakdown } from "../domain/types";

export type AlphaScoreInputs = {
  readonly signalQuality: number;
  readonly strategyConsensus: number;
  readonly agentConsensus: number;
  readonly marketContext: number;
  readonly riskPenalty: number;
  readonly liquidity: number;
  readonly spreadQuality: number;
  readonly portfolioCorrelationFit: number;
  readonly valuation: number;
  readonly trend: number;
  readonly fundamentals: number;
  readonly news: number;
  readonly macro: number;
  readonly sentiment: number;
  readonly dataFreshness: number;
};

const WEIGHTS = {
  signalQuality: 0.14,
  strategyConsensus: 0.1,
  agentConsensus: 0.1,
  marketContext: 0.08,
  risk: 0.1,
  liquidity: 0.07,
  spread: 0.06,
  portfolioCorrelation: 0.06,
  valuation: 0.05,
  trend: 0.06,
  fundamentals: 0.05,
  news: 0.04,
  macro: 0.04,
  sentiment: 0.03,
  dataFreshness: 0.02,
} as const;

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function clamp100(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n * 10) / 10));
}

/** Each factor input is 0–1 except riskPenalty (higher = worse). */
export function computeAlphaScore(inputs: AlphaScoreInputs): AlphaScoreBreakdown {
  const risk = clamp01(1 - clamp01(inputs.riskPenalty));
  const parts = {
    signalQuality: clamp01(inputs.signalQuality),
    strategyConsensus: clamp01(inputs.strategyConsensus),
    agentConsensus: clamp01(inputs.agentConsensus),
    marketContext: clamp01(inputs.marketContext),
    risk,
    liquidity: clamp01(inputs.liquidity),
    spread: clamp01(inputs.spreadQuality),
    portfolioCorrelation: clamp01(inputs.portfolioCorrelationFit),
    valuation: clamp01(inputs.valuation),
    trend: clamp01(inputs.trend),
    fundamentals: clamp01(inputs.fundamentals),
    news: clamp01(inputs.news),
    macro: clamp01(inputs.macro),
    sentiment: clamp01(inputs.sentiment),
    dataFreshness: clamp01(inputs.dataFreshness),
  };

  const total01 =
    parts.signalQuality * WEIGHTS.signalQuality +
    parts.strategyConsensus * WEIGHTS.strategyConsensus +
    parts.agentConsensus * WEIGHTS.agentConsensus +
    parts.marketContext * WEIGHTS.marketContext +
    parts.risk * WEIGHTS.risk +
    parts.liquidity * WEIGHTS.liquidity +
    parts.spread * WEIGHTS.spread +
    parts.portfolioCorrelation * WEIGHTS.portfolioCorrelation +
    parts.valuation * WEIGHTS.valuation +
    parts.trend * WEIGHTS.trend +
    parts.fundamentals * WEIGHTS.fundamentals +
    parts.news * WEIGHTS.news +
    parts.macro * WEIGHTS.macro +
    parts.sentiment * WEIGHTS.sentiment +
    parts.dataFreshness * WEIGHTS.dataFreshness;

  const scale = (v: number) => clamp100(v * 100);

  return {
    signalQuality: scale(parts.signalQuality),
    strategyConsensus: scale(parts.strategyConsensus),
    agentConsensus: scale(parts.agentConsensus),
    marketContext: scale(parts.marketContext),
    risk: scale(parts.risk),
    liquidity: scale(parts.liquidity),
    spread: scale(parts.spread),
    portfolioCorrelation: scale(parts.portfolioCorrelation),
    valuation: scale(parts.valuation),
    trend: scale(parts.trend),
    fundamentals: scale(parts.fundamentals),
    news: scale(parts.news),
    macro: scale(parts.macro),
    sentiment: scale(parts.sentiment),
    dataFreshness: scale(parts.dataFreshness),
    total: clamp100(total01 * 100),
  };
}

export function gradeFromScore(
  score: number,
  confidence: number,
  hardRejected: boolean,
): AlphaGrade {
  if (hardRejected) return "REJECTED";
  if (score >= 85 && confidence >= 0.72) return "A+";
  if (score >= 70 && confidence >= 0.58) return "A";
  if (score >= 55) return "B";
  if (score >= 40) return "C";
  return "D";
}

export function canEscalateToCommittee(grade: AlphaGrade): boolean {
  return grade === "A+" || grade === "A";
}
