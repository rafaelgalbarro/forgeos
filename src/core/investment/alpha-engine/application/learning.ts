/**
 * Post-trade learning — proposes adjustments; never mutates production strategies.
 */

import type { AlphaLearningProposal, AlphaOpportunity, AlphaPostTradeReview } from "../domain/types";

export type ClosedTradeOutcome = {
  readonly opportunityId: string;
  readonly actualEntry: number;
  readonly actualExit: number;
  readonly actualReturnPct: number;
  readonly actualRiskPct: number;
  readonly slippageBps: number;
  readonly closedAt: string;
};

const NEXT_PATH = [
  "backtesting",
  "walk-forward",
  "paper-trading",
  "shadow-trading",
  "certification",
] as const;

export function buildPostTradeReview(
  opportunity: AlphaOpportunity,
  outcome: ClosedTradeOutcome,
): AlphaPostTradeReview {
  const predictedEntry = opportunity.entryEstimated;
  const predictedExit = opportunity.target;
  const timingError =
    predictedEntry != null && predictedEntry > 0
      ? Math.abs(outcome.actualEntry - predictedEntry) / predictedEntry
      : null;
  const returnError =
    opportunity.expectedReturnPct != null
      ? Math.abs(outcome.actualReturnPct - opportunity.expectedReturnPct)
      : null;
  const thesisError =
    opportunity.expectedReturnPct != null &&
    Math.sign(outcome.actualReturnPct) !== Math.sign(opportunity.expectedReturnPct)
      ? "Direction of realized return diverged from thesis"
      : returnError != null && returnError > 2
        ? "Magnitude error vs expected return"
        : null;

  const strategyAccuracy =
    opportunity.expectedReturnPct != null && opportunity.expectedReturnPct !== 0
      ? Math.max(
          0,
          1 -
            Math.abs(outcome.actualReturnPct - opportunity.expectedReturnPct) /
              Math.max(Math.abs(opportunity.expectedReturnPct), 0.5),
        )
      : null;

  const learningProposal =
    thesisError != null
      ? `Revisit ${opportunity.strategy} entry filters for ${opportunity.asset}; re-run lab certification path.`
      : timingError != null && timingError > 0.01
        ? `Tighten entry zone / latency assumptions for ${opportunity.strategy}.`
        : `Maintain ${opportunity.strategy}; accumulate multi-session sample evidence.`;

  return {
    opportunityId: opportunity.id,
    asset: opportunity.asset,
    strategy: opportunity.strategy,
    predictedEntry,
    actualEntry: outcome.actualEntry,
    predictedExit,
    actualExit: outcome.actualExit,
    expectedReturnPct: opportunity.expectedReturnPct,
    actualReturnPct: outcome.actualReturnPct,
    expectedRiskPct: opportunity.expectedRiskPct,
    actualRiskPct: outcome.actualRiskPct,
    slippage: outcome.slippageBps,
    timingError,
    thesisError,
    committeeAccuracy: opportunity.escalateToCommittee ? strategyAccuracy : null,
    strategyAccuracy,
    learningProposal,
    mutatesProduction: false,
    nextValidationPath: NEXT_PATH,
  };
}

export function proposalFromReview(review: AlphaPostTradeReview): AlphaLearningProposal {
  return {
    id: `learn-${review.opportunityId}`,
    opportunityId: review.opportunityId,
    summary: review.learningProposal,
    rationale:
      review.thesisError ??
      `timingError=${review.timingError ?? "NO_DATA"} strategyAccuracy=${review.strategyAccuracy ?? "NO_DATA"}`,
    status: "proposed",
    mutatesProduction: false,
    mustRevalidateVia: [...NEXT_PATH],
  };
}
