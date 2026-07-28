/** ForgeOS Worker Runtime — health tracking (Epic 4.3). */

export type WorkerHealthLevel =
  | "HEALTHY"
  | "WARNING"
  | "DEGRADED"
  | "CRITICAL"
  | "OFFLINE";

export const HEALTH_LEVEL_LABELS: Record<WorkerHealthLevel, string> = {
  HEALTHY: "Healthy",
  WARNING: "Warning",
  DEGRADED: "Degraded",
  CRITICAL: "Critical",
  OFFLINE: "Offline",
};

export interface WorkerHealthMetrics {
  lastExecutionAt: string | null;
  lastErrorAt: string | null;
  errorCount: number;
  successCount: number;
  failureCount: number;
  totalExecutionMs: number;
  executionCount: number;
  consecutiveFailures: number;
}

export function createInitialHealthMetrics(): WorkerHealthMetrics {
  return {
    lastExecutionAt: null,
    lastErrorAt: null,
    errorCount: 0,
    successCount: 0,
    failureCount: 0,
    totalExecutionMs: 0,
    executionCount: 0,
    consecutiveFailures: 0,
  };
}

export function computeAvgExecutionMs(metrics: WorkerHealthMetrics): number {
  if (metrics.executionCount === 0) return 0;
  return Math.round(metrics.totalExecutionMs / metrics.executionCount);
}

export function computeHealthLevel(
  metrics: WorkerHealthMetrics,
  statusOffline = false,
): WorkerHealthLevel {
  if (statusOffline) return "OFFLINE";
  if (metrics.consecutiveFailures >= 5) return "CRITICAL";
  if (metrics.consecutiveFailures >= 3) return "DEGRADED";
  if (metrics.consecutiveFailures >= 1 || metrics.errorCount > 0) return "WARNING";
  if (metrics.executionCount === 0) return "HEALTHY";
  return "HEALTHY";
}

export function recordExecutionSuccess(
  metrics: WorkerHealthMetrics,
  durationMs: number,
): WorkerHealthMetrics {
  const now = new Date().toISOString();
  return {
    ...metrics,
    lastExecutionAt: now,
    successCount: metrics.successCount + 1,
    executionCount: metrics.executionCount + 1,
    totalExecutionMs: metrics.totalExecutionMs + durationMs,
    consecutiveFailures: 0,
  };
}

export function recordExecutionFailure(
  metrics: WorkerHealthMetrics,
  durationMs: number,
): WorkerHealthMetrics {
  const now = new Date().toISOString();
  return {
    ...metrics,
    lastExecutionAt: now,
    lastErrorAt: now,
    errorCount: metrics.errorCount + 1,
    failureCount: metrics.failureCount + 1,
    executionCount: metrics.executionCount + 1,
    totalExecutionMs: metrics.totalExecutionMs + durationMs,
    consecutiveFailures: metrics.consecutiveFailures + 1,
  };
}
