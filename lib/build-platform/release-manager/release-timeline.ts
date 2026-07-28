import type { ApprovalWorkflowState, QualityGateResult, ReleaseTimelineEvent } from "./types";

export function buildReleaseTimeline(
  ventureName: string,
  gates: QualityGateResult[],
  approvals: ApprovalWorkflowState,
  createdAt: string,
): ReleaseTimelineEvent[] {
  const passedGates = gates.filter((g) => g.status === "pass").length;
  const events: ReleaseTimelineEvent[] = [
    {
      id: "timeline-build-start",
      timestamp: createdAt,
      phase: "build",
      label: "Release package build started",
      detail: `Assembling factory outputs for ${ventureName}.`,
    },
    {
      id: "timeline-artifacts",
      timestamp: createdAt,
      phase: "build",
      label: "Factory artifacts collected",
      detail: "Frontend, backend, database, QA, and infrastructure blueprints bundled.",
    },
    {
      id: "timeline-validate",
      timestamp: createdAt,
      phase: "validate",
      label: "Quality gates evaluated",
      detail: `${passedGates}/${gates.length} gates passed.`,
    },
    {
      id: "timeline-review",
      timestamp: createdAt,
      phase: "review",
      label: "Approval workflow initialized",
      detail: `Status: ${approvals.status}. ${approvals.steps.length} approval steps defined.`,
    },
  ];

  if (approvals.blockers.length > 0) {
    events.push({
      id: "timeline-blocked",
      timestamp: createdAt,
      phase: "review",
      label: "Release blocked",
      detail: approvals.blockers.join("; "),
    });
  } else {
    events.push({
      id: "timeline-ready",
      timestamp: createdAt,
      phase: "approve",
      label: "Ready for review",
      detail: "No blocking quality gates — awaiting stakeholder approvals.",
    });
  }

  return events;
}
