/** PROGRAM 6030 — Recovery actions (isolated failure; no full mission restart). */

import type { MissionExecutionPlan, RecoveryActionType, WorkflowNode } from "../types";

export interface RecoveryRequest {
  action: RecoveryActionType;
  nodeId?: string;
  changes?: Record<string, unknown>;
  reason?: string;
}

export interface RecoveryResult {
  ok: boolean;
  action: RecoveryActionType;
  plan: MissionExecutionPlan;
  message: string;
}

function touch(plan: MissionExecutionPlan, nodes: WorkflowNode[]): MissionExecutionPlan {
  return { ...plan, nodes, updatedAt: new Date().toISOString() };
}

export function applyRecovery(
  plan: MissionExecutionPlan,
  request: RecoveryRequest,
): RecoveryResult {
  const { action, nodeId } = request;

  switch (action) {
    case "pause":
      return {
        ok: true,
        action,
        plan: { ...plan, status: "paused", updatedAt: new Date().toISOString() },
        message: "Mission paused",
      };
    case "resume":
      return {
        ok: true,
        action,
        plan: { ...plan, status: "executing", updatedAt: new Date().toISOString() },
        message: "Mission resumed",
      };
    case "cancel":
      return {
        ok: true,
        action,
        plan: touch(
          { ...plan, status: "cancelled" },
          plan.nodes.map((n) =>
            n.status === "pending" ||
            n.status === "ready" ||
            n.status === "running" ||
            n.status === "awaiting_approval" ||
            n.status === "blocked"
              ? { ...n, status: "cancelled" }
              : n,
          ),
        ),
        message: "Mission cancelled; in-flight dependents cancelled",
      };
    case "retry":
    case "retry_with_change": {
      if (!nodeId) {
        return { ok: false, action, plan, message: "nodeId required for retry" };
      }
      const nodes = plan.nodes.map((n) => {
        if (n.nodeId !== nodeId) return n;
        if (n.attempt >= n.retryPolicy.maxAttempts && action === "retry") {
          return n;
        }
        return {
          ...n,
          status: "ready" as const,
          error: undefined,
          progress: 0,
          attempt: n.attempt + (action === "retry" ? 0 : 0),
          ...(request.changes ? { inputReferences: [...n.inputReferences] } : {}),
        };
      });
      const target = nodes.find((n) => n.nodeId === nodeId);
      if (!target) return { ok: false, action, plan, message: "Node not found" };
      if (
        action === "retry" &&
        plan.nodes.find((n) => n.nodeId === nodeId)!.attempt >=
          plan.nodes.find((n) => n.nodeId === nodeId)!.retryPolicy.maxAttempts
      ) {
        return { ok: false, action, plan, message: "Max retry attempts reached" };
      }
      return {
        ok: true,
        action,
        plan: touch({ ...plan, status: "executing" }, nodes),
        message:
          action === "retry_with_change"
            ? `Retrying ${nodeId} with change`
            : `Retrying isolated node ${nodeId}`,
      };
    }
    case "skip_optional": {
      if (!nodeId) return { ok: false, action, plan, message: "nodeId required" };
      const target = plan.nodes.find((n) => n.nodeId === nodeId);
      if (!target?.optional) {
        return { ok: false, action, plan, message: "Node is not optional" };
      }
      return {
        ok: true,
        action,
        plan: touch(
          plan,
          plan.nodes.map((n) =>
            n.nodeId === nodeId
              ? { ...n, status: "skipped", progress: 1, error: request.reason }
              : n,
          ),
        ),
        message: `Skipped optional node ${nodeId}`,
      };
    }
    case "logical_rollback": {
      if (!nodeId) return { ok: false, action, plan, message: "nodeId required" };
      const idx = plan.nodes.findIndex((n) => n.nodeId === nodeId);
      if (idx < 0) return { ok: false, action, plan, message: "Node not found" };
      // Logical rollback: reset target + dependents only (not whole mission).
      const dependents = new Set<string>([nodeId]);
      let changed = true;
      while (changed) {
        changed = false;
        for (const n of plan.nodes) {
          if (dependents.has(n.nodeId)) continue;
          if (n.dependencies.some((d) => dependents.has(d))) {
            dependents.add(n.nodeId);
            changed = true;
          }
        }
      }
      return {
        ok: true,
        action,
        plan: touch(
          { ...plan, status: "executing" },
          plan.nodes.map((n) =>
            dependents.has(n.nodeId)
              ? {
                  ...n,
                  status: n.nodeId === nodeId ? ("ready" as const) : ("pending" as const),
                  progress: 0,
                  artifactRefs: [],
                  error: undefined,
                  finishedAt: undefined,
                }
              : n,
          ),
        ),
        message: `Logical rollback from ${nodeId} (${dependents.size} nodes)`,
      };
    }
    case "repair_plan": {
      return {
        ok: true,
        action,
        plan: {
          ...plan,
          version: plan.version + 1,
          status: plan.status === "failed" ? "executing" : plan.status,
          updatedAt: new Date().toISOString(),
        },
        message: "Plan version bumped for repair",
      };
    }
    case "human_intervention":
      return {
        ok: true,
        action,
        plan: { ...plan, status: "paused", updatedAt: new Date().toISOString() },
        message: request.reason ?? "Paused for human intervention",
      };
    default:
      return { ok: false, action, plan, message: "Unknown recovery action" };
  }
}
