/** ForgeOS Worker Runtime — aggregate metrics (Epic 4.3). */

import type { WorkerHealthLevel } from "./health";
import type { WorkerStatus } from "./worker-status";
import type { WorkerInstance } from "./types";

export interface WorkerRuntimeMetrics {
  totalWorkers: number;
  byStatus: Record<WorkerStatus, number>;
  byHealth: Record<WorkerHealthLevel, number>;
  byDepartment: Record<string, number>;
  totalExecutions: number;
  totalSuccesses: number;
  totalFailures: number;
  avgExecutionMs: number;
}

function emptyStatusCounts(): Record<WorkerStatus, number> {
  return {
    IDLE: 0,
    WAITING: 0,
    READY: 0,
    RUNNING: 0,
    BLOCKED: 0,
    PAUSED: 0,
    FAILED: 0,
    COMPLETED: 0,
    OFFLINE: 0,
    DEPRECATED: 0,
  };
}

function emptyHealthCounts(): Record<WorkerHealthLevel, number> {
  return {
    HEALTHY: 0,
    WARNING: 0,
    DEGRADED: 0,
    CRITICAL: 0,
    OFFLINE: 0,
  };
}

export function computeWorkerMetrics(workers: WorkerInstance[]): WorkerRuntimeMetrics {
  const byStatus = emptyStatusCounts();
  const byHealth = emptyHealthCounts();
  const byDepartment: Record<string, number> = {};
  let totalExecutions = 0;
  let totalSuccesses = 0;
  let totalFailures = 0;
  let totalMs = 0;

  for (const worker of workers) {
    byStatus[worker.status]++;
    byHealth[worker.health.level]++;
    byDepartment[worker.department] = (byDepartment[worker.department] ?? 0) + 1;
    totalExecutions += worker.health.successCount + worker.health.failureCount;
    totalSuccesses += worker.health.successCount;
    totalFailures += worker.health.failureCount;
    totalMs += worker.health.avgExecutionMs * (worker.health.successCount + worker.health.failureCount);
  }

  return {
    totalWorkers: workers.length,
    byStatus,
    byHealth,
    byDepartment,
    totalExecutions,
    totalSuccesses,
    totalFailures,
    avgExecutionMs: totalExecutions > 0 ? Math.round(totalMs / totalExecutions) : 0,
  };
}
