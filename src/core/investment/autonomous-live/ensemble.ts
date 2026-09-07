/**
 * Strategy ensemble — no single-strategy execution.
 * Requires min consensus, positive EV after costs, min confidence,
 * compatible regime, liquidity, spread, risk approval. Records dissent.
 */

import type {
  EnsembleConsensusResult,
  EnsembleStrategyId,
  StrategyVote,
  TradeDecision,
} from "./domain";

export const ENSEMBLE_STRATEGY_IDS: readonly EnsembleStrategyId[] = [
  "trend_following",
  "momentum",
  "breakout",
  "mean_reversion",
  "volatility_expansion",
  "relative_strength",
  "event_driven",
  "portfolio_rebalancing",
] as const;

export interface EnsembleInput {
  readonly votes: readonly StrategyVote[];
  readonly minConsensus: number;
  readonly minConfidence: number;
  readonly liquidityOk: boolean;
  readonly spreadOk: boolean;
  readonly riskApproved: boolean;
  readonly regime: string;
}

export function evaluateEnsembleConsensus(input: EnsembleInput): EnsembleConsensusResult {
  const votes = input.votes;
  if (votes.length < 2) {
    return {
      approved: false,
      decision: "NO_TRADE",
      side: "FLAT",
      consensusRatio: 0,
      minConsensusRequired: input.minConsensus,
      averageConfidence: 0,
      positiveEvAfterCosts: false,
      votes,
      dissent: votes,
      minorityReport: "Ensemble requires multiple strategies — single-strategy execution forbidden.",
      reason: "NO_TRADE: insufficient strategy votes for ensemble",
    };
  }

  const actionable = votes.filter((v) => v.side !== "FLAT" && v.regimeCompatible);
  if (actionable.length === 0) {
    return noTrade(votes, input.minConsensus, "NO_TRADE: no regime-compatible actionable votes");
  }

  const buy = actionable.filter((v) => v.side === "BUY");
  const sell = actionable.filter((v) => v.side === "SELL");
  const side: "BUY" | "SELL" = buy.length >= sell.length ? "BUY" : "SELL";
  const majority = side === "BUY" ? buy : sell;
  const dissent = actionable.filter((v) => v.side !== side);
  const consensusRatio = majority.length / actionable.length;
  const averageConfidence =
    majority.reduce((sum, v) => sum + v.confidence, 0) / Math.max(1, majority.length);
  const avgEv =
    majority.reduce((sum, v) => sum + v.expectedValueAfterCosts, 0) / Math.max(1, majority.length);
  const positiveEvAfterCosts = avgEv > 0;

  const blockers: string[] = [];
  if (consensusRatio < input.minConsensus) {
    blockers.push(`consensus ${consensusRatio.toFixed(2)} < ${input.minConsensus}`);
  }
  if (averageConfidence < input.minConfidence) {
    blockers.push(`confidence ${averageConfidence.toFixed(2)} < ${input.minConfidence}`);
  }
  if (!positiveEvAfterCosts) blockers.push("EV after costs not positive");
  if (!input.liquidityOk) blockers.push("insufficient liquidity");
  if (!input.spreadOk) blockers.push("spread not allowed");
  if (!input.riskApproved) blockers.push("risk not approved");

  const minorityReport =
    dissent.length === 0
      ? "Unanimous among actionable votes."
      : dissent.map((d) => `${d.strategyId}:${d.side}(${d.confidence.toFixed(2)}) — ${d.rationale}`).join("; ");

  if (blockers.length > 0) {
    return {
      approved: false,
      decision: "NO_TRADE",
      side: "FLAT",
      consensusRatio,
      minConsensusRequired: input.minConsensus,
      averageConfidence,
      positiveEvAfterCosts,
      votes,
      dissent,
      minorityReport,
      reason: `NO_TRADE: ensemble blocked — ${blockers.join("; ")}`,
    };
  }

  return {
    approved: true,
    decision: "TRADE" as TradeDecision,
    side,
    consensusRatio,
    minConsensusRequired: input.minConsensus,
    averageConfidence,
    positiveEvAfterCosts,
    votes,
    dissent,
    minorityReport,
    reason: `Ensemble consensus ${side} @ ${(consensusRatio * 100).toFixed(0)}%`,
  };
}

function noTrade(
  votes: readonly StrategyVote[],
  minConsensus: number,
  reason: string,
): EnsembleConsensusResult {
  return {
    approved: false,
    decision: "NO_TRADE",
    side: "FLAT",
    consensusRatio: 0,
    minConsensusRequired: minConsensus,
    averageConfidence: 0,
    positiveEvAfterCosts: false,
    votes,
    dissent: votes,
    minorityReport: reason,
    reason,
  };
}

/** Build default dry-run votes for UI / locked cycles (analysis only). */
export function buildDemoEnsembleVotes(symbol: string): StrategyVote[] {
  return ENSEMBLE_STRATEGY_IDS.map((strategyId, i) => ({
    strategyId,
    side: i % 3 === 0 ? "FLAT" : "BUY",
    confidence: 0.5 + (i % 5) * 0.08,
    expectedValueAfterCosts: i % 4 === 0 ? -0.01 : 0.02,
    regimeCompatible: strategyId !== "mean_reversion",
    rationale: `${strategyId} analysis for ${symbol} (locked AUTONOMOUS_LIVE — no execution)`,
  }));
}
