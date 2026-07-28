import type { ApprovalWorkflowState, QualityGateResult, ReleaseStatus } from "./types";

const APPROVAL_ROLES = [
  "Tech Lead",
  "QA Lead",
  "Product Owner",
  "Release Manager",
] as const;

export function createApprovalWorkflow(
  gates: QualityGateResult[],
  now = new Date().toISOString(),
): ApprovalWorkflowState {
  const blockers = gates.filter((g) => g.blocking && g.status !== "pass").map((g) => g.label);
  const status = resolveInitialStatus(blockers);

  return {
    status,
    steps: APPROVAL_ROLES.map((role) => ({
      id: role.toLowerCase().replace(/\s+/g, "-"),
      role,
      status: status === "READY_FOR_REVIEW" ? "pending" : "skipped",
    })),
    blockers,
    lastTransitionAt: now,
  };
}

export function resolveInitialStatus(blockers: string[]): ReleaseStatus {
  if (blockers.length > 0) return "BLOCKED";
  return "READY_FOR_REVIEW";
}

export function transitionApprovalStatus(
  workflow: ApprovalWorkflowState,
  next: ReleaseStatus,
): ApprovalWorkflowState {
  return {
    ...workflow,
    status: next,
    lastTransitionAt: new Date().toISOString(),
  };
}

export const RELEASE_STATUS_LABELS: Record<ReleaseStatus, string> = {
  DRAFT: "Draft",
  READY_FOR_REVIEW: "Ready for Review",
  APPROVED: "Approved",
  BLOCKED: "Blocked",
  REJECTED: "Rejected",
  RELEASED: "Released",
  ROLLED_BACK: "Rolled Back",
};
