/** Runtime error recording (Epic 4.6). */

import {
  nextObservabilityId,
  pushBounded,
  type ObservabilityStore,
  getStoreLimits,
} from "./runtime-store";
import type {
  HistoryEntry,
  RuntimeComponentId,
  RuntimeErrorRecord,
  RuntimeErrorSeverity,
  RuntimeMonitorOptions,
} from "./types";

export interface RecordErrorInput {
  component: RuntimeComponentId;
  message: string;
  severity?: RuntimeErrorSeverity;
  ventureId?: string;
  taskId?: string;
  workerId?: string;
  stack?: string;
  context?: Record<string, unknown>;
}

export function recordRuntimeError(
  store: ObservabilityStore,
  input: RecordErrorInput,
  options: RuntimeMonitorOptions = {},
): RuntimeErrorRecord {
  const record: RuntimeErrorRecord = {
    id: nextObservabilityId("err"),
    component: input.component,
    message: input.message,
    severity: input.severity ?? "medium",
    timestamp: new Date().toISOString(),
    ventureId: input.ventureId,
    taskId: input.taskId,
    workerId: input.workerId,
    stack: input.stack,
    context: input.context,
  };

  const limits = getStoreLimits(options);
  pushBounded(store.errors, record, limits.errors);

  const historyEntry: HistoryEntry = {
    id: nextObservabilityId("hist"),
    timestamp: record.timestamp,
    kind: "error",
    summary: `[${record.component}] ${record.message}`,
    payload: { errorId: record.id, severity: record.severity },
  };
  pushBounded(store.history, historyEntry, limits.history);

  return record;
}

export function getRuntimeErrors(
  store: ObservabilityStore,
  filter?: { component?: RuntimeComponentId; ventureId?: string },
): RuntimeErrorRecord[] {
  let results = [...store.errors];
  if (filter?.component) {
    results = results.filter((e) => e.component === filter.component);
  }
  if (filter?.ventureId) {
    results = results.filter((e) => e.ventureId === filter.ventureId);
  }
  return results;
}

export function clearRuntimeErrors(store: ObservabilityStore): void {
  store.errors.length = 0;
}
