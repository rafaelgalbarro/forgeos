import type { VentureProject } from "@/lib/domain/venture";
import { resolvePrimaryDecision } from "@/lib/fos";
import { runDebate } from "../debate";
import { computeConsensus } from "../consensus";
import { getAllBoardMembers } from "../member";
import type { BoardDecision, BoardSession } from "../types";
import { castVotes } from "../voting";

export function createBoardSession(
  question: string,
  ventures: VentureProject[]
): BoardSession {
  const debate = runDebate(question, ventures);
  const consensus = computeConsensus(debate);
  const votes = castVotes(consensus);
  const decision = resolvePrimaryDecision(ventures);

  const finalDecision =
    consensus.score >= 55
      ? decision.label
      : "Posponer — resolver riesgos antes de ejecutar";

  const boardDecision: BoardDecision = {
    question,
    debate,
    consensus,
    finalDecision,
    rationale:
      consensus.score >= 55
        ? `Mayoría a favor (${votes.filter((v) => v.vote === "approve").length} votos). ${decision.rationale}`
        : "El board recomienda resolver riesgos críticos antes de avanzar.",
    decidedAt: new Date().toISOString(),
  };

  return {
    id: `board-${Date.now()}`,
    question,
    members: getAllBoardMembers().map((m) => m.role),
    decision: boardDecision,
  };
}
