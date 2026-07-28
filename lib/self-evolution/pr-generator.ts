/** Program 2035 — PR proposals (dry-run only). */

import type { ImprovementProposal, ProposedBranch, ProposedPullRequest } from "./types";

export interface PrGeneratorOptions {
  githubToken?: string;
  approvalFlag?: boolean;
}

export function proposePullRequest(
  proposal: ImprovementProposal,
  branch: ProposedBranch
): ProposedPullRequest {
  return {
    proposalId: proposal.id,
    title: `[Self-Evolution] ${proposal.title}`,
    body: [
      "## Resumen",
      proposal.description,
      "",
      "## Impacto",
      proposal.impact,
      "",
      "## Riesgo",
      proposal.risk,
      "",
      "## Checklist",
      "- [ ] Tests pasan",
      "- [ ] Review humano",
      "- [ ] Aprobación executive mesh",
      "",
      "---",
      "**DRY-RUN** — Este PR no se crea en GitHub sin token + approval flag.",
    ].join("\n"),
    branchName: branch.branchName,
    targetBranch: "main",
    labels: ["self-evolution", "dry-run", proposal.affectedArea],
    dryRun: true,
    githubApiCalled: false,
    requiresApprovalFlag: true,
  };
}

export function proposePullRequests(
  proposals: ImprovementProposal[],
  branches: ProposedBranch[]
): ProposedPullRequest[] {
  const branchMap = new Map(branches.map((b) => [b.proposalId, b]));
  return proposals
    .map((p) => {
      const branch = branchMap.get(p.id);
      return branch ? proposePullRequest(p, branch) : null;
    })
    .filter((pr): pr is ProposedPullRequest => pr !== null);
}

/** Only calls GitHub API if token AND approval flag — otherwise dry-run */
export function simulatePrCreate(
  pr: ProposedPullRequest,
  options: PrGeneratorOptions = {}
): { created: false; reason: string; pr: ProposedPullRequest } {
  if (!options.approvalFlag) {
    return {
      created: false,
      reason: "Requiere approval flag explícito",
      pr,
    };
  }
  if (!options.githubToken) {
    return {
      created: false,
      reason: "Sin GITHUB_TOKEN — simulación únicamente",
      pr,
    };
  }
  return {
    created: false,
    reason: "Dry-run activo por governance — PR no creado",
    pr,
  };
}
