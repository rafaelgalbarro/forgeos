/** Execution trace tracking (Epic 4.6). */

import {
  getStoreLimits,
  nextObservabilityId,
  pushBounded,
  type ObservabilityStore,
} from "./runtime-store";
import type {
  HistoryEntry,
  RuntimeMonitorOptions,
  RuntimeTrace,
  TraceSpan,
  TraceStage,
} from "./types";

const STAGE_ORDER: TraceStage[] = [
  "event",
  "scheduler",
  "queue",
  "worker",
  "execution",
  "memory",
  "finished",
];

export function createRuntimeTrace(ventureId: string, eventId?: string): RuntimeTrace {
  const now = new Date().toISOString();
  return {
    id: nextObservabilityId("trace"),
    ventureId,
    eventId: eventId ?? null,
    taskId: null,
    workerId: null,
    startedAt: now,
    completedAt: null,
    totalLatencyMs: null,
    status: "in_progress",
    spans: [],
    errors: [],
    warnings: [],
  };
}

export function startTraceSpan(
  trace: RuntimeTrace,
  stage: TraceStage,
  entityId?: string,
  entityType?: string,
): TraceSpan {
  const span: TraceSpan = {
    stage,
    startedAt: new Date().toISOString(),
    completedAt: null,
    latencyMs: null,
    entityId,
    entityType,
    errors: [],
    warnings: [],
  };
  trace.spans.push(span);
  return span;
}

export function completeTraceSpan(
  span: TraceSpan,
  opts?: { errors?: string[]; warnings?: string[] },
): void {
  const now = new Date().toISOString();
  span.completedAt = now;
  span.latencyMs = new Date(now).getTime() - new Date(span.startedAt).getTime();
  if (opts?.errors) span.errors.push(...opts.errors);
  if (opts?.warnings) span.warnings.push(...opts.warnings);
}

export function finalizeTrace(
  trace: RuntimeTrace,
  status: RuntimeTrace["status"],
): RuntimeTrace {
  const now = new Date().toISOString();
  trace.completedAt = now;
  trace.status = status;
  trace.totalLatencyMs =
    new Date(now).getTime() - new Date(trace.startedAt).getTime();
  trace.errors = trace.spans.flatMap((s) => s.errors);
  trace.warnings = trace.spans.flatMap((s) => s.warnings);
  return trace;
}

export function storeTrace(
  store: ObservabilityStore,
  trace: RuntimeTrace,
  options: RuntimeMonitorOptions = {},
): RuntimeTrace {
  const limits = getStoreLimits(options);
  pushBounded(store.traces, trace, limits.traces);

  const historyEntry: HistoryEntry = {
    id: nextObservabilityId("hist"),
    timestamp: trace.completedAt ?? trace.startedAt,
    kind: "trace",
    summary: `Trace ${trace.id} — ${trace.status}`,
    payload: {
      traceId: trace.id,
      ventureId: trace.ventureId,
      latencyMs: trace.totalLatencyMs,
      spanCount: trace.spans.length,
    },
  };
  pushBounded(store.history, historyEntry, limits.history);

  return trace;
}

/** Build a full pipeline trace from event through memory. */
export function buildPipelineTrace(params: {
  ventureId: string;
  eventId: string;
  eventType: string;
  schedulerTaskId?: string;
  queueTaskId?: string;
  workerId?: string;
  executionMs?: number;
  memoryWritten?: boolean;
  errors?: string[];
  warnings?: string[];
}): RuntimeTrace {
  const trace = createRuntimeTrace(params.ventureId, params.eventId);
  trace.taskId = params.queueTaskId ?? params.schedulerTaskId ?? null;
  trace.workerId = params.workerId ?? null;

  const eventSpan = startTraceSpan(trace, "event", params.eventId, params.eventType);
  completeTraceSpan(eventSpan);

  const schedSpan = startTraceSpan(
    trace,
    "scheduler",
    params.schedulerTaskId,
    "scheduler-task",
  );
  completeTraceSpan(schedSpan, { warnings: params.schedulerTaskId ? [] : ["No scheduler task"] });

  const queueSpan = startTraceSpan(trace, "queue", params.queueTaskId, "queue-task");
  completeTraceSpan(queueSpan, { warnings: params.queueTaskId ? [] : ["No queue task"] });

  const workerSpan = startTraceSpan(trace, "worker", params.workerId, "worker");
  completeTraceSpan(workerSpan, { warnings: params.workerId ? [] : ["No worker assigned"] });

  const execSpan = startTraceSpan(trace, "execution", params.queueTaskId, "execution");
  if (params.executionMs !== undefined) {
    execSpan.latencyMs = params.executionMs;
    execSpan.completedAt = new Date(
      new Date(execSpan.startedAt).getTime() + params.executionMs,
    ).toISOString();
  } else {
    completeTraceSpan(execSpan, { warnings: ["Execution engine stubbed (Epic 4.5)"] });
  }

  const memSpan = startTraceSpan(trace, "memory", params.ventureId, "memory");
  completeTraceSpan(memSpan, {
    warnings: params.memoryWritten ? [] : ["No memory write recorded"],
  });

  const finSpan = startTraceSpan(trace, "finished");
  completeTraceSpan(finSpan, { errors: params.errors, warnings: params.warnings });

  const hasErrors = (params.errors?.length ?? 0) > 0;
  const allStagesPresent =
    params.schedulerTaskId && params.queueTaskId && params.workerId;

  finalizeTrace(
    trace,
    hasErrors ? "failed" : allStagesPresent ? "completed" : "partial",
  );

  return trace;
}

export function getTracesForVenture(
  store: ObservabilityStore,
  ventureId: string,
  limit = 50,
): RuntimeTrace[] {
  return store.traces.filter((t) => t.ventureId === ventureId).slice(0, limit);
}

export function getExpectedStageOrder(): TraceStage[] {
  return [...STAGE_ORDER];
}
