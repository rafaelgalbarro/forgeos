/** PROGRAM 6030 — Kernel operational events (aligned with 6040 catalog). */

export type KernelEventType =
  | "MISSION_CREATED"
  | "MISSION_STARTED"
  | "MISSION_PAUSED"
  | "MISSION_RESUMED"
  | "MISSION_CANCELLED"
  | "MISSION_COMPLETED"
  | "MISSION_FAILED"
  | "PLAN_CREATED"
  | "PLAN_APPROVED"
  | "PLAN_REPAIRED"
  | "NODE_READY"
  | "NODE_STARTED"
  | "NODE_COMPLETED"
  | "NODE_FAILED"
  | "NODE_SKIPPED"
  | "NODE_BLOCKED"
  | "APPROVAL_REQUESTED"
  | "APPROVAL_GRANTED"
  | "APPROVAL_DENIED"
  | "OUTPUT_SELECTION_PROPOSED"
  | "OUTPUT_SELECTION_APPROVED"
  | "RECOVERY_APPLIED"
  | "SNAPSHOT_TAKEN";

export interface KernelEvent {
  id: string;
  type: KernelEventType;
  missionId: string;
  timestamp: string;
  source: string;
  payload: Record<string, unknown>;
}

export function createKernelEvent(
  type: KernelEventType,
  missionId: string,
  payload: Record<string, unknown> = {},
  source = "orchestration-kernel",
): KernelEvent {
  const timestamp = new Date().toISOString();
  return {
    id: `ke_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    type,
    missionId,
    timestamp,
    source,
    payload,
  };
}
