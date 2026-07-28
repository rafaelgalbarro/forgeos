/** Program 2035 — Executive review simulation (status tracking only). */

import type { ExecutiveReviewSimulation, ExecutiveReviewStep, ImprovementProposal } from "./types";

const STAGES: Array<{ stage: ExecutiveReviewStep["stage"]; label: string; reviewer: string }> = [
  { stage: "ceo", label: "Revisión CEO", reviewer: "CEO Agent" },
  { stage: "board", label: "Revisión Board", reviewer: "Board Simulator" },
  { stage: "department-owners", label: "Department Owners", reviewer: "Dept Owners Mesh" },
  { stage: "risk-review", label: "Risk Review", reviewer: "Risk Officer" },
  { stage: "approval", label: "Approval Layer", reviewer: "Human Approver" },
];

export function simulateExecutiveReview(
  proposal: ImprovementProposal,
  index: number
): ExecutiveReviewSimulation {
  const steps: ExecutiveReviewStep[] = STAGES.map((s, i) => {
    let status: ExecutiveReviewStep["status"] = "pending";
    if (index === 0 && i === 0) status = "in-review";
    if (index === 1 && i <= 1) status = i === 1 ? "in-review" : "approved";
    if (index === 2 && i <= 2) status = i === 2 ? "in-review" : "approved";
    return {
      stage: s.stage,
      label: s.label,
      status,
      reviewer: s.reviewer,
      notes: status === "in-review" ? "En revisión — requiere humano" : undefined,
      reviewedAt: status === "approved" ? new Date().toISOString() : undefined,
    };
  });

  const currentIdx = steps.findIndex((s) => s.status === "in-review" || s.status === "pending");
  const currentStage = steps[Math.max(0, currentIdx)]!.stage;
  const allApproved = steps.every((s) => s.status === "approved");
  const anyRejected = steps.some((s) => s.status === "rejected");

  return {
    proposalId: proposal.id,
    steps,
    currentStage,
    overallStatus: anyRejected ? "rejected" : allApproved ? "approved" : currentIdx >= 0 ? "in-review" : "pending",
    dryRun: true,
  };
}

export function simulateAllExecutiveReviews(
  proposals: ImprovementProposal[]
): ExecutiveReviewSimulation[] {
  return proposals.map((p, i) => simulateExecutiveReview(p, i));
}
