/** ForgeOS Execution Engine — session lifecycle (Epic 4.5). */

import type { ExecutionSession, ExecutionSessionEvent } from "./types";
import type { ExecutionPipelineState } from "./execution-status";
import type { ExecutionMemoryWrite } from "./memory-adapter";
import type { ExecutionDecisionWrite } from "./decision-graph-adapter";
import { nextSessionId } from "./execution-store";

export function createExecutionSession(params: {
  ventureId: string;
  workerId: string;
  taskId: string;
  taskType: string;
  queueWaitMs?: number | null;
  schedulerDelayMs?: number | null;
}): ExecutionSession {
  const now = new Date().toISOString();
  return {
    sessionId: nextSessionId(),
    ventureId: params.ventureId,
    workerId: params.workerId,
    taskId: params.taskId,
    taskType: params.taskType,
    startedAt: now,
    finishedAt: null,
    status: "ACTIVE",
    pipelineState: "READY",
    duration: null,
    warnings: [],
    errors: [],
    events: [{ type: "session_created", timestamp: now }],
    memoryWrites: [],
    decisionWrites: [],
    queueWaitMs: params.queueWaitMs ?? null,
    schedulerDelayMs: params.schedulerDelayMs ?? null,
    provider: "mock",
    model: "none",
    latencyMs: null,
    fallback: false,
  };
}

export function appendSessionEvent(
  session: ExecutionSession,
  type: string,
  detail?: string,
): ExecutionSession {
  const event: ExecutionSessionEvent = {
    type,
    timestamp: new Date().toISOString(),
    detail,
  };
  return {
    ...session,
    events: [...session.events, event],
  };
}

export function transitionSessionPipeline(
  session: ExecutionSession,
  pipelineState: ExecutionPipelineState,
  detail?: string,
): ExecutionSession {
  let updated = appendSessionEvent(
    session,
    `pipeline_${pipelineState.toLowerCase()}`,
    detail,
  );
  updated = { ...updated, pipelineState };
  return updated;
}

export function finishSession(
  session: ExecutionSession,
  params: {
    success: boolean;
    errors?: string[];
    warnings?: string[];
    memoryWrites?: ExecutionMemoryWrite[];
    decisionWrites?: ExecutionDecisionWrite[];
    provider?: string;
    model?: string;
    latencyMs?: number;
    fallback?: boolean;
    durationMs: number;
  },
): ExecutionSession {
  const now = new Date().toISOString();
  const status = params.success ? "COMPLETED" : "FAILED";
  const pipelineState = params.success ? "COMPLETED" : "FAILED";

  return {
    ...session,
    finishedAt: now,
    status,
    pipelineState,
    duration: params.durationMs,
    errors: params.errors ?? session.errors,
    warnings: params.warnings ?? session.warnings,
    memoryWrites: params.memoryWrites ?? session.memoryWrites,
    decisionWrites: params.decisionWrites ?? session.decisionWrites,
    provider: params.provider ?? session.provider,
    model: params.model ?? session.model,
    latencyMs: params.latencyMs ?? session.latencyMs,
    fallback: params.fallback ?? session.fallback,
    events: [
      ...session.events,
      {
        type: params.success ? "session_completed" : "session_failed",
        timestamp: now,
        detail: params.errors?.[0],
      },
    ],
  };
}
