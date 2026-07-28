/** PROGRAM 6030 — Weighted progress calculation. */

import type { MissionExecutionPlan, ProgressBreakdown, WorkflowNode } from "../types";

function nodeProgressValue(node: WorkflowNode): number {
  if (node.status === "completed" || node.status === "skipped") return 1;
  if (node.status === "failed" || node.status === "cancelled") return node.progress;
  return node.progress;
}

export function computeProgress(plan: MissionExecutionPlan): ProgressBreakdown {
  const totalWeight = plan.nodes.reduce((s, n) => s + n.weight, 0) || 1;
  const mission =
    plan.nodes.reduce((s, n) => s + nodeProgressValue(n) * n.weight, 0) / totalWeight;

  const stage: Record<string, number> = {};
  for (const st of plan.stages) {
    const nodes = plan.nodes.filter((n) => st.nodeIds.includes(n.nodeId));
    const w = nodes.reduce((s, n) => s + n.weight, 0) || 1;
    stage[st.stageId] = nodes.reduce((s, n) => s + nodeProgressValue(n) * n.weight, 0) / w;
  }

  const byType = (types: WorkflowNode["type"][]) => {
    const nodes = plan.nodes.filter((n) => types.includes(n.type));
    if (!nodes.length) return 0;
    const w = nodes.reduce((s, n) => s + n.weight, 0) || 1;
    return nodes.reduce((s, n) => s + nodeProgressValue(n) * n.weight, 0) / w;
  };

  return {
    mission,
    stage,
    output: byType(["GENERATE_OUTPUT", "GENERATE_ARTIFACT", "GENERATE_CODEBASE"]),
    build: byType(["BUILD", "VALIDATE"]),
    deployment: byType(["CREATE_PREVIEW", "CREATE_RELEASE", "DEPLOY"]),
  };
}
