/** Program 2035 — Branch proposals (dry-run only). */

import type { ImprovementProposal, ProposedBranch } from "./types";

export function proposeBranch(proposal: ImprovementProposal): ProposedBranch {
  const slug = proposal.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return {
    proposalId: proposal.id,
    branchName: `feat/self-evo-${slug}`,
    baseBranch: "main",
    description: `[DRY-RUN] Branch propuesto para: ${proposal.title}. NO se crea hasta aprobación humana.`,
    dryRun: true,
    simulated: true,
  };
}

export function proposeBranches(proposals: ImprovementProposal[]): ProposedBranch[] {
  return proposals.map(proposeBranch);
}

/** Simulates branch creation — never touches git */
export function simulateBranchCreate(branch: ProposedBranch): {
  success: true;
  message: string;
  branch: ProposedBranch;
} {
  return {
    success: true,
    message: `SIMULACIÓN: git checkout -b ${branch.branchName} (no ejecutado)`,
    branch,
  };
}
