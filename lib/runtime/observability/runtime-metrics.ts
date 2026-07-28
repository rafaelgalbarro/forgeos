/** Runtime metrics aggregation (Epic 4.6). */

import { getExecutiveObservations } from "@/lib/ai-orchestration/observability";
import { computeWorkerMetrics } from "../workers/metrics";
import type { ObservabilityStore } from "./runtime-store";
import type {
  RuntimeMetricsSnapshot,
  RuntimeObservabilityContext,
  RuntimeTrace,
} from "./types";

function avgLatencyFromTraces(traces: RuntimeTrace[]): number {
  const completed = traces.filter((t) => t.totalLatencyMs !== null);
  if (completed.length === 0) return 0;
  const sum = completed.reduce((acc, t) => acc + (t.totalLatencyMs ?? 0), 0);
  return Math.round(sum / completed.length);
}

function taskThroughput(traces: RuntimeTrace[], uptimeMs: number): number {
  const completed = traces.filter((t) => t.status === "completed").length;
  if (uptimeMs <= 0) return 0;
  const hours = uptimeMs / 3_600_000;
  return hours > 0 ? Math.round((completed / hours) * 100) / 100 : completed;
}

export function collectRuntimeMetrics(
  ctx: RuntimeObservabilityContext,
  store: ObservabilityStore,
): RuntimeMetricsSnapshot {
  const now = Date.now();
  const uptimeMs = now - store.startedAt;
  const queueSnapshot = ctx.queue.getSnapshot(ctx.ventureId);
  const schedulerSnapshot = ctx.scheduler.getSnapshot(ctx.ventureId);
  const workers = ctx.workers.list();
  const workerMetrics = computeWorkerMetrics(workers);
  const observations = getExecutiveObservations(ctx.ventureId);

  const aiCallCount = observations.length;
  const estimatedAiCost = observations.reduce((sum, o) => sum + o.costEstimate, 0);
  const eventCount = ctx.eventBus.getHistory(500).length;

  return {
    uptimeMs,
    avgLatencyMs: avgLatencyFromTraces(store.traces),
    taskThroughput: taskThroughput(store.traces, uptimeMs),
    activeWorkers: workerMetrics.byStatus.RUNNING + workerMetrics.byStatus.READY,
    blockedWorkers: workerMetrics.byStatus.BLOCKED + workerMetrics.byStatus.WAITING,
    errorCount: store.errors.length,
    retryCount: queueSnapshot.metrics.retryCount,
    deadLetterCount: queueSnapshot.metrics.deadLetter,
    avgWorkerExecutionMs: workerMetrics.avgExecutionMs,
    aiCallCount,
    estimatedAiCost: Math.round(estimatedAiCost * 10000) / 10000,
    eventCount,
    queueDepth:
      queueSnapshot.metrics.ready +
      queueSnapshot.metrics.running +
      queueSnapshot.metrics.blocked,
    schedulerTaskCount: schedulerSnapshot.tasks.length,
    collectedAt: new Date().toISOString(),
  };
}
