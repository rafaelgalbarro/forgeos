/** ForgeOS Worker Runtime — status states and transitions (Epic 4.3). */

export type WorkerStatus =
  | "IDLE"
  | "WAITING"
  | "READY"
  | "RUNNING"
  | "BLOCKED"
  | "PAUSED"
  | "FAILED"
  | "COMPLETED"
  | "OFFLINE"
  | "DEPRECATED";

export interface WorkerStatusTransition {
  from: WorkerStatus;
  to: WorkerStatus;
  reason: string;
  timestamp: string;
}

export const WORKER_STATUS_LABELS: Record<WorkerStatus, string> = {
  IDLE: "Idle",
  WAITING: "Waiting",
  READY: "Ready",
  RUNNING: "Running",
  BLOCKED: "Blocked",
  PAUSED: "Paused",
  FAILED: "Failed",
  COMPLETED: "Completed",
  OFFLINE: "Offline",
  DEPRECATED: "Deprecated",
};

/** Allowed status transitions — all recorded in history. */
const ALLOWED_TRANSITIONS: Record<WorkerStatus, WorkerStatus[]> = {
  IDLE: ["WAITING", "READY", "OFFLINE", "DEPRECATED"],
  WAITING: ["READY", "BLOCKED", "PAUSED", "OFFLINE", "IDLE"],
  READY: ["RUNNING", "BLOCKED", "PAUSED", "OFFLINE", "IDLE"],
  RUNNING: ["COMPLETED", "FAILED", "BLOCKED", "PAUSED", "OFFLINE"],
  BLOCKED: ["WAITING", "READY", "PAUSED", "IDLE", "OFFLINE"],
  PAUSED: ["WAITING", "READY", "IDLE", "OFFLINE", "DEPRECATED"],
  FAILED: ["IDLE", "WAITING", "READY", "OFFLINE", "DEPRECATED"],
  COMPLETED: ["IDLE", "WAITING", "READY", "OFFLINE"],
  OFFLINE: ["IDLE", "DEPRECATED"],
  DEPRECATED: [],
};

const transitionHistory: WorkerStatusTransition[] = [];

export function canTransitionStatus(from: WorkerStatus, to: WorkerStatus): boolean {
  if (from === to) return true;
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

export function transitionStatus(
  from: WorkerStatus,
  to: WorkerStatus,
  reason: string,
): WorkerStatus {
  if (from === to) return to;
  if (!canTransitionStatus(from, to)) {
    throw new Error(`Invalid worker status transition: ${from} → ${to}`);
  }
  const record: WorkerStatusTransition = {
    from,
    to,
    reason,
    timestamp: new Date().toISOString(),
  };
  transitionHistory.push(record);
  return to;
}

export function getStatusTransitionHistory(limit?: number): WorkerStatusTransition[] {
  const history = [...transitionHistory];
  if (limit !== undefined && limit >= 0) {
    return history.slice(-limit);
  }
  return history;
}

export function clearStatusTransitionHistory(): void {
  transitionHistory.length = 0;
}

export function getAllowedTargetStatuses(from: WorkerStatus): WorkerStatus[] {
  return [...(ALLOWED_TRANSITIONS[from] ?? [])];
}
