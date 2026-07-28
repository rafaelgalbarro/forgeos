/** ForgeOS Worker Runtime — worker entity helpers (Epic 4.3). */

import {
  computeAvgExecutionMs,
  computeHealthLevel,
  createInitialHealthMetrics,
  type WorkerHealthMetrics,
} from "./health";
import { transitionStatus } from "./worker-status";
import type { WorkerDefinition, WorkerHealthSnapshot, WorkerInstance } from "./types";
import type { WorkerStatus } from "./worker-status";

export function createWorkerInstance(definition: WorkerDefinition): WorkerInstance {
  const now = new Date().toISOString();
  const metrics = createInitialHealthMetrics();
  return {
    ...definition,
    status: "IDLE",
    health: toHealthSnapshot(metrics),
    registeredAt: now,
    updatedAt: now,
  };
}

export function toHealthSnapshot(metrics: WorkerHealthMetrics): WorkerHealthSnapshot {
  return {
    level: computeHealthLevel(metrics),
    lastExecutionAt: metrics.lastExecutionAt,
    lastErrorAt: metrics.lastErrorAt,
    errorCount: metrics.errorCount,
    successCount: metrics.successCount,
    failureCount: metrics.failureCount,
    avgExecutionMs: computeAvgExecutionMs(metrics),
    consecutiveFailures: metrics.consecutiveFailures,
  };
}

export function updateWorkerStatus(
  worker: WorkerInstance,
  to: WorkerStatus,
  reason: string,
): WorkerInstance {
  const newStatus = transitionStatus(worker.status, to, reason);
  return {
    ...worker,
    status: newStatus,
    updatedAt: new Date().toISOString(),
  };
}

export function supportsTask(worker: WorkerInstance, taskType: string): boolean {
  return worker.supportedTasks.includes(taskType);
}

export function isAllowedInState(worker: WorkerInstance, state: string): boolean {
  return worker.allowedStates.includes(state as WorkerInstance["allowedStates"][number]);
}

export function hasCapability(worker: WorkerInstance, capabilityId: string): boolean {
  return worker.capabilities.some((c) => c.id === capabilityId);
}
