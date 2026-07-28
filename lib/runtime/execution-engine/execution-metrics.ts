/** ForgeOS Execution Engine — metrics computation (Epic 4.5). */

import type { ExecutionSession } from "./types";
import type { ExecutionTelemetrySummary } from "./execution-telemetry";
import type { ExecutionHistoryStore } from "./execution-history";

export interface ExecutionMetrics {
  totalSessions: number;
  activeSessions: number;
  completedSessions: number;
  failedSessions: number;
  retrySessions: number;
  deadLetterSessions: number;
  avgDurationMs: number;
  maxDurationMs: number;
  workerUsage: Record<string, number>;
  failureRate: number;
  telemetry: ExecutionTelemetrySummary;
}

export function computeExecutionMetrics(
  sessions: ExecutionSession[],
  history: ExecutionHistoryStore,
  telemetrySummary: ExecutionTelemetrySummary,
): ExecutionMetrics {
  const completed = sessions.filter((s) => s.status === "COMPLETED");
  const failed = sessions.filter((s) => s.status === "FAILED");
  const retry = sessions.filter((s) => s.status === "RETRY");
  const deadLetter = sessions.filter((s) => s.status === "DEAD_LETTER");
  const active = sessions.filter((s) => s.status === "ACTIVE");

  const durations = sessions
    .map((s) => s.duration)
    .filter((d): d is number => d !== null);

  const workerUsage: Record<string, number> = {};
  for (const s of sessions) {
    workerUsage[s.workerId] = (workerUsage[s.workerId] ?? 0) + 1;
  }

  const total = sessions.length;
  const failureRate = total > 0 ? failed.length / total : 0;

  return {
    totalSessions: total,
    activeSessions: active.length,
    completedSessions: completed.length,
    failedSessions: failed.length,
    retrySessions: retry.length,
    deadLetterSessions: deadLetter.length,
    avgDurationMs:
      durations.length > 0
        ? durations.reduce((a, b) => a + b, 0) / durations.length
        : 0,
    maxDurationMs: durations.length > 0 ? Math.max(...durations) : 0,
    workerUsage,
    failureRate,
    telemetry: telemetrySummary,
  };
}

export function computeSchedulerDelayMs(
  taskEnqueuedAt: string,
  schedulerTaskCreatedAt?: string | null,
): number | null {
  if (!schedulerTaskCreatedAt) return null;
  const enqueued = new Date(taskEnqueuedAt).getTime();
  const created = new Date(schedulerTaskCreatedAt).getTime();
  if (Number.isNaN(enqueued) || Number.isNaN(created)) return null;
  return Math.max(0, enqueued - created);
}

export function computeQueueWaitMs(
  taskEnqueuedAt: string,
  startedAt: string,
): number {
  const enqueued = new Date(taskEnqueuedAt).getTime();
  const started = new Date(startedAt).getTime();
  if (Number.isNaN(enqueued) || Number.isNaN(started)) return 0;
  return Math.max(0, started - enqueued);
}
