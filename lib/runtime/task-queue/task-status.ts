/** Official task queue states (Epic 4.4). */

export type QueueTaskStatus =
  | "PENDING"
  | "READY"
  | "WAITING"
  | "BLOCKED"
  | "RUNNING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED"
  | "TIMEOUT"
  | "RETRYING"
  | "DEAD_LETTER";

export const QUEUE_STATUS_LABELS: Record<QueueTaskStatus, string> = {
  PENDING: "Pending",
  READY: "Ready",
  WAITING: "Waiting",
  BLOCKED: "Blocked",
  RUNNING: "Running",
  COMPLETED: "Completed",
  FAILED: "Failed",
  CANCELLED: "Cancelled",
  TIMEOUT: "Timeout",
  RETRYING: "Retrying",
  DEAD_LETTER: "Dead Letter",
};

export const TERMINAL_STATUSES: QueueTaskStatus[] = [
  "COMPLETED",
  "FAILED",
  "CANCELLED",
  "TIMEOUT",
  "DEAD_LETTER",
];

export const ACTIVE_STATUSES: QueueTaskStatus[] = [
  "PENDING",
  "READY",
  "WAITING",
  "BLOCKED",
  "RUNNING",
  "RETRYING",
];

export function isTerminalStatus(status: QueueTaskStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}

export function canTransitionStatus(from: QueueTaskStatus, to: QueueTaskStatus): boolean {
  if (from === to) return true;
  if (isTerminalStatus(from) && from !== "RETRYING") return false;

  const allowed: Record<QueueTaskStatus, QueueTaskStatus[]> = {
    PENDING: ["READY", "WAITING", "BLOCKED", "CANCELLED"],
    READY: ["RUNNING", "BLOCKED", "CANCELLED", "WAITING"],
    WAITING: ["READY", "BLOCKED", "CANCELLED"],
    BLOCKED: ["READY", "WAITING", "CANCELLED"],
    RUNNING: ["COMPLETED", "FAILED", "TIMEOUT", "CANCELLED", "RETRYING"],
    COMPLETED: [],
    FAILED: ["RETRYING", "DEAD_LETTER", "CANCELLED"],
    CANCELLED: [],
    TIMEOUT: ["RETRYING", "DEAD_LETTER", "FAILED"],
    RETRYING: ["READY", "RUNNING", "FAILED", "DEAD_LETTER"],
    DEAD_LETTER: [],
  };

  return allowed[from]?.includes(to) ?? false;
}

export function resolveInitialStatus(blocked: boolean, waiting: boolean): QueueTaskStatus {
  if (blocked) return "BLOCKED";
  if (waiting) return "WAITING";
  return "PENDING";
}
