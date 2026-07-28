import type { BoardConsensus, BoardMemberRole, BoardVote } from "../types";

export interface VoteResult {
  role: BoardMemberRole;
  vote: BoardVote;
  reason: string;
}

export function castVotes(consensus: BoardConsensus): VoteResult[] {
  const results: VoteResult[] = [];

  for (const role of consensus.supporting) {
    results.push({
      role,
      vote: "approve",
      reason: "Alineado con pros y oportunidades identificadas.",
    });
  }

  for (const role of consensus.dissenting) {
    results.push({
      role,
      vote: consensus.score >= 55 ? "abstain" : "reject",
      reason: "Preocupaciones en contras o riesgos no resueltas.",
    });
  }

  return results;
}

export function tallyVotes(votes: VoteResult[]): { approve: number; reject: number; abstain: number } {
  return votes.reduce(
    (acc, v) => {
      acc[v.vote] += 1;
      return acc;
    },
    { approve: 0, reject: 0, abstain: 0 }
  );
}
