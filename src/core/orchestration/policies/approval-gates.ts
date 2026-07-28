/** PROGRAM 6030 — Decision gates / approvals. */

import type { ApprovalRecord, DecisionGateType, MissionExecutionPlan, WorkflowNode } from "../types";

export function isGateBlocking(gate: DecisionGateType): boolean {
  return (
    gate === "APPROVAL" ||
    gate === "SECURITY_APPROVAL" ||
    gate === "FINANCIAL_APPROVAL" ||
    gate === "DEPLOYMENT_APPROVAL"
  );
}

export function nodeNeedsApproval(node: WorkflowNode): boolean {
  return node.approvalPolicy.required && isGateBlocking(node.approvalPolicy.gate);
}

export function findPendingApproval(
  plan: MissionExecutionPlan,
  nodeId: string,
): ApprovalRecord | undefined {
  return plan.approvals.find((a) => a.nodeId === nodeId && a.status === "pending");
}

export function grantApproval(
  plan: MissionExecutionPlan,
  approvalId: string,
  resolvedBy: string,
  rationale?: string,
): MissionExecutionPlan {
  const now = new Date().toISOString();
  return {
    ...plan,
    updatedAt: now,
    approvals: plan.approvals.map((a) =>
      a.approvalId === approvalId
        ? { ...a, status: "granted", resolvedAt: now, resolvedBy, rationale }
        : a,
    ),
  };
}

export function denyApproval(
  plan: MissionExecutionPlan,
  approvalId: string,
  resolvedBy: string,
  rationale?: string,
): MissionExecutionPlan {
  const now = new Date().toISOString();
  return {
    ...plan,
    updatedAt: now,
    approvals: plan.approvals.map((a) =>
      a.approvalId === approvalId
        ? { ...a, status: "denied", resolvedAt: now, resolvedBy, rationale }
        : a,
    ),
  };
}

/** Dependent nodes stay blocked while required approval is missing. */
export function applyApprovalBlocks(plan: MissionExecutionPlan): MissionExecutionPlan {
  const deniedOrPending = new Set(
    plan.approvals
      .filter((a) => a.status !== "granted" && a.nodeId)
      .map((a) => a.nodeId!),
  );

  const nodes = plan.nodes.map((node) => {
    if (!nodeNeedsApproval(node)) return node;
    if (node.status === "completed" || node.status === "skipped" || node.status === "cancelled") {
      return node;
    }
    const approval = findPendingApproval(plan, node.nodeId);
    const record = plan.approvals.find((a) => a.nodeId === node.nodeId);
    if (record?.status === "denied") {
      return { ...node, status: "blocked" as const, error: "Approval denied" };
    }
    if (approval || deniedOrPending.has(node.nodeId)) {
      if (node.approvalPolicy.autoApproveInDryRun && plan.executionMode === "DRY_RUN") {
        return node;
      }
      return { ...node, status: "awaiting_approval" as const };
    }
    return node;
  });

  // Block dependents of awaiting/blocked approval nodes
  const blockedIds = new Set(
    nodes
      .filter((n) => n.status === "awaiting_approval" || n.status === "blocked")
      .map((n) => n.nodeId),
  );

  const withDependents = nodes.map((node) => {
    if (node.status !== "pending" && node.status !== "ready") return node;
    if (node.dependencies.some((d) => blockedIds.has(d))) {
      return { ...node, status: "blocked" as const, error: "Upstream approval missing" };
    }
    return node;
  });

  return { ...plan, nodes: withDependents, updatedAt: new Date().toISOString() };
}

export function autoApproveForDryRun(plan: MissionExecutionPlan): MissionExecutionPlan {
  if (plan.executionMode !== "DRY_RUN" && plan.executionMode !== "PREVIEW_ONLY") {
    return plan;
  }
  const now = new Date().toISOString();
  return {
    ...plan,
    approvals: plan.approvals.map((a) =>
      a.status === "pending"
        ? {
            ...a,
            status: "granted",
            resolvedAt: now,
            resolvedBy: "dry-run-auto",
            rationale: "Auto-approved in DRY_RUN/PREVIEW_ONLY",
          }
        : a,
    ),
  };
}
