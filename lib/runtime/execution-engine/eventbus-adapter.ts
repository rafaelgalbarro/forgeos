/** ForgeOS Execution Engine — Event Bus adapter (Epic 4.5). */

import type { RuntimeEventBus } from "../event-bus/types";
import type { ExecutionPipelineState } from "./execution-status";
import type { ExecutionSession } from "./types";

export type ExecutionEventType =
  | "EXECUTION_STARTED"
  | "EXECUTION_FINISHED"
  | "EXECUTION_FAILED"
  | "WORKER_DISPATCHED"
  | "TASK_EXECUTED"
  | "SESSION_CREATED"
  | "SESSION_FINISHED";

export function publishSessionCreated(
  bus: RuntimeEventBus,
  source: string,
  session: ExecutionSession,
): void {
  bus.publish({
    type: "SESSION_CREATED",
    source,
    payload: {
      sessionId: session.sessionId,
      ventureId: session.ventureId,
      workerId: session.workerId,
      taskId: session.taskId,
      status: session.status,
    },
  });
}

export function publishSessionFinished(
  bus: RuntimeEventBus,
  source: string,
  session: ExecutionSession,
): void {
  bus.publish({
    type: "SESSION_FINISHED",
    source,
    payload: {
      sessionId: session.sessionId,
      ventureId: session.ventureId,
      workerId: session.workerId,
      taskId: session.taskId,
      status: session.status,
      durationMs: session.duration ?? undefined,
      error: session.errors[0],
    },
  });
}

export function publishExecutionStarted(
  bus: RuntimeEventBus,
  source: string,
  session: ExecutionSession,
  pipelineState: ExecutionPipelineState,
): void {
  bus.publish({
    type: "EXECUTION_STARTED",
    source,
    payload: {
      sessionId: session.sessionId,
      ventureId: session.ventureId,
      taskId: session.taskId,
      workerId: session.workerId,
      pipelineState,
    },
  });
}

export function publishExecutionFinished(
  bus: RuntimeEventBus,
  source: string,
  session: ExecutionSession,
): void {
  bus.publish({
    type: "EXECUTION_FINISHED",
    source,
    payload: {
      sessionId: session.sessionId,
      ventureId: session.ventureId,
      taskId: session.taskId,
      workerId: session.workerId,
      pipelineState: session.pipelineState,
      durationMs: session.duration ?? undefined,
    },
  });
}

export function publishExecutionFailed(
  bus: RuntimeEventBus,
  source: string,
  session: ExecutionSession,
  error: string,
): void {
  bus.publish({
    type: "EXECUTION_FAILED",
    source,
    payload: {
      sessionId: session.sessionId,
      ventureId: session.ventureId,
      taskId: session.taskId,
      workerId: session.workerId,
      pipelineState: session.pipelineState,
      durationMs: session.duration ?? undefined,
      error,
    },
  });
}

export function publishWorkerDispatched(
  bus: RuntimeEventBus,
  source: string,
  params: {
    workerId: string;
    ventureId: string;
    taskId: string;
    taskType: string;
    sessionId: string;
    reason: string;
  },
): void {
  bus.publish({
    type: "WORKER_DISPATCHED",
    source,
    payload: params,
  });
}

export function publishTaskExecuted(
  bus: RuntimeEventBus,
  source: string,
  params: {
    taskId: string;
    ventureId: string;
    taskType: string;
    workerId: string;
    sessionId: string;
    success: boolean;
    durationMs: number;
    error?: string;
  },
): void {
  bus.publish({
    type: "TASK_EXECUTED",
    source,
    payload: params,
  });
}

export function getExecutionEvents(
  bus: RuntimeEventBus,
  limit = 50,
): ReturnType<RuntimeEventBus["getHistory"]> {
  return bus
    .getHistoryByCategory("execution", limit)
    .reverse();
}
