/** PROGRAM 6030 — Workflow graph helpers. */

import type { WorkflowNode, WorkflowStage } from "../types";
import { getReadyNodes, validateWorkflowDag } from "./dag-validator";

export { detectCycles, topologicalSort, validateWorkflowDag, getReadyNodes } from "./dag-validator";

export function syncStageStatuses(stages: WorkflowStage[], nodes: WorkflowNode[]): WorkflowStage[] {
  const byId = new Map(nodes.map((n) => [n.nodeId, n]));
  return stages.map((stage) => {
    const stageNodes = stage.nodeIds.map((id) => byId.get(id)).filter(Boolean) as WorkflowNode[];
    if (!stageNodes.length) return { ...stage, status: "pending", progress: 0 };

    const totalWeight = stageNodes.reduce((s, n) => s + n.weight, 0) || 1;
    const progress =
      stageNodes.reduce((s, n) => s + n.progress * n.weight, 0) / totalWeight;

    let status = stage.status;
    if (stageNodes.every((n) => n.status === "completed" || n.status === "skipped")) {
      status = "completed";
    } else if (stageNodes.some((n) => n.status === "failed")) {
      status = "failed";
    } else if (stageNodes.some((n) => n.status === "running" || n.status === "awaiting_approval")) {
      status = "running";
    } else if (stageNodes.some((n) => n.status === "blocked")) {
      status = "blocked";
    } else if (getReadyNodes(stageNodes).length || stageNodes.some((n) => n.status === "ready")) {
      status = "ready";
    } else {
      status = "pending";
    }

    return { ...stage, status, progress };
  });
}

export function assertValidGraph(nodes: WorkflowNode[], stages: WorkflowStage[]): void {
  const result = validateWorkflowDag(nodes, stages);
  if (!result.ok) {
    throw new Error(
      `Invalid workflow DAG: ${result.issues.map((i) => `${i.code}: ${i.message}`).join("; ")}`,
    );
  }
}
