/** PROGRAM 6030 — Snapshot builder (Mission Control reads snapshots, not Kernel). */

import type { DepartmentId } from "../../domain/types";
import type { KernelEvent } from "../ports/kernel-events";
import type { MissionExecutionPlan, MissionKernelStatus } from "../types";
import { computeProgress } from "../coordination/progress";
import type {
  ApprovalSnapshot,
  CostSnapshot,
  DepartmentSnapshot,
  MissionExecutionSnapshot,
  NodeSnapshot,
  StageSnapshot,
} from "./types";

export function buildMissionExecutionSnapshot(
  plan: MissionExecutionPlan,
  status: MissionKernelStatus,
  events: KernelEvent[] = [],
): MissionExecutionSnapshot {
  const nodes: NodeSnapshot[] = plan.nodes.map((n) => ({
    nodeId: n.nodeId,
    type: n.type,
    label: n.label,
    status: n.status,
    progress: n.progress,
    department: n.assignedDepartment,
    error: n.error,
    artifactRefs: n.artifactRefs,
  }));

  const stages: StageSnapshot[] = plan.stages.map((s) => ({
    stageId: s.stageId,
    label: s.label,
    status: s.status,
    progress: s.progress,
    nodeIds: s.nodeIds,
  }));

  const deptMap = new Map<DepartmentId, DepartmentSnapshot>();
  for (const n of plan.nodes) {
    const cur = deptMap.get(n.assignedDepartment) ?? {
      department: n.assignedDepartment,
      activeNodes: 0,
      completedNodes: 0,
      failedNodes: 0,
    };
    if (n.status === "running" || n.status === "ready" || n.status === "awaiting_approval") {
      cur.activeNodes += 1;
    }
    if (n.status === "completed" || n.status === "skipped") cur.completedNodes += 1;
    if (n.status === "failed") cur.failedNodes += 1;
    deptMap.set(n.assignedDepartment, cur);
  }

  const approvals: ApprovalSnapshot = {
    pending: plan.approvals.filter((a) => a.status === "pending"),
    granted: plan.approvals.filter((a) => a.status === "granted"),
    denied: plan.approvals.filter((a) => a.status === "denied"),
  };

  const cost: CostSnapshot = {
    estimated: plan.estimatedCost,
    durationEstimated: plan.estimatedDuration,
    disclaimer: "Estimates only — not actual spend or wall-clock billing data",
  };

  return {
    missionId: plan.missionId,
    planId: plan.planId,
    planVersion: plan.version,
    status,
    objective: plan.objective,
    progress: computeProgress(plan),
    stages,
    nodes,
    departments: [...deptMap.values()],
    approvals,
    cost,
    capturedAt: new Date().toISOString(),
    eventsTail: events.slice(-20).map((e) => ({
      type: e.type,
      timestamp: e.timestamp,
    })),
  };
}
