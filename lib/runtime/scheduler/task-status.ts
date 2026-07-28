/** Task status transitions (Epic 4.1). */

import type { TaskStatus } from "./types";

const VALID_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  pending: ["ready", "blocked", "cancelled"],
  ready: ["running", "blocked", "cancelled"],
  blocked: ["ready", "pending", "cancelled"],
  running: ["completed", "failed", "cancelled"],
  completed: [],
  failed: ["pending", "ready", "cancelled"],
  cancelled: [],
};

export function canTransition(from: TaskStatus, to: TaskStatus): boolean {
  if (from === to) return true;
  return VALID_TRANSITIONS[from].includes(to);
}

export function assertValidTransition(from: TaskStatus, to: TaskStatus): void {
  if (!canTransition(from, to)) {
    throw new Error(`Invalid task status transition: ${from} → ${to}`);
  }
}

/** Derive operational status from dependency satisfaction. */
export function resolveDependencyStatus(
  current: TaskStatus,
  allDependenciesMet: boolean,
  hasUnmetDependencies: boolean,
): TaskStatus {
  if (current === "completed" || current === "failed" || current === "cancelled" || current === "running") {
    return current;
  }

  if (hasUnmetDependencies) {
    return "blocked";
  }

  if (allDependenciesMet) {
    return "ready";
  }

  return current === "blocked" ? "blocked" : "pending";
}

export const STATUS_LABELS: Record<TaskStatus, string> = {
  pending: "Pending",
  ready: "Ready",
  blocked: "Blocked",
  running: "Running",
  completed: "Completed",
  failed: "Failed",
  cancelled: "Cancelled",
};
