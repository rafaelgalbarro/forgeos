/** ForgeOS Worker Runtime — Event Bus adapter (Epic 4.3). */

import type { RuntimeEventBus, PublishInput } from "../event-bus/types";
import type { WorkerHealthLevel } from "./health";
import type { WorkerStatus } from "./worker-status";
import type { SupportedTask } from "./types";

export type WorkerRuntimeEventType =
  | "WORKER_REGISTERED"
  | "WORKER_STARTED"
  | "WORKER_COMPLETED"
  | "WORKER_FAILED"
  | "WORKER_BLOCKED"
  | "WORKER_PAUSED"
  | "WORKER_RESUMED"
  | "WORKER_HEALTH_CHANGED";

export function publishWorkerRegistered(
  bus: RuntimeEventBus,
  source: string,
  payload: {
    workerId: string;
    name: string;
    department: string;
    version: string;
    ventureId?: string;
  },
): void {
  bus.publish({
    type: "WORKER_REGISTERED",
    source,
    payload,
  } as PublishInput<"WORKER_REGISTERED">);
}

export function publishWorkerStarted(
  bus: RuntimeEventBus,
  source: string,
  payload: {
    workerId: string;
    ventureId: string;
    taskType: SupportedTask;
    taskId: string;
  },
): void {
  bus.publish({
    type: "WORKER_STARTED",
    source,
    payload,
  } as PublishInput<"WORKER_STARTED">);
}

export function publishWorkerCompleted(
  bus: RuntimeEventBus,
  source: string,
  payload: {
    workerId: string;
    ventureId: string;
    taskType: SupportedTask;
    taskId: string;
    durationMs: number;
    summary?: string;
  },
): void {
  bus.publish({
    type: "WORKER_COMPLETED",
    source,
    payload,
  } as PublishInput<"WORKER_COMPLETED">);
}

export function publishWorkerFailed(
  bus: RuntimeEventBus,
  source: string,
  payload: {
    workerId: string;
    ventureId: string;
    taskType: SupportedTask;
    taskId: string;
    durationMs: number;
    error: string;
  },
): void {
  bus.publish({
    type: "WORKER_FAILED",
    source,
    payload,
  } as PublishInput<"WORKER_FAILED">);
}

export function publishWorkerBlocked(
  bus: RuntimeEventBus,
  source: string,
  payload: {
    workerId: string;
    ventureId: string;
    from: WorkerStatus;
    to: WorkerStatus;
    reason: string;
    taskType?: SupportedTask;
  },
): void {
  bus.publish({
    type: "WORKER_BLOCKED",
    source,
    payload,
  } as PublishInput<"WORKER_BLOCKED">);
}

export function publishWorkerPaused(
  bus: RuntimeEventBus,
  source: string,
  payload: {
    workerId: string;
    ventureId?: string;
    from: WorkerStatus;
    to: WorkerStatus;
    reason: string;
  },
): void {
  bus.publish({
    type: "WORKER_PAUSED",
    source,
    payload,
  } as PublishInput<"WORKER_PAUSED">);
}

export function publishWorkerResumed(
  bus: RuntimeEventBus,
  source: string,
  payload: {
    workerId: string;
    ventureId?: string;
    from: WorkerStatus;
    to: WorkerStatus;
    reason: string;
  },
): void {
  bus.publish({
    type: "WORKER_RESUMED",
    source,
    payload,
  } as PublishInput<"WORKER_RESUMED">);
}

export function publishWorkerHealthChanged(
  bus: RuntimeEventBus,
  source: string,
  payload: {
    workerId: string;
    from: WorkerHealthLevel;
    to: WorkerHealthLevel;
    reason: string;
  },
): void {
  bus.publish({
    type: "WORKER_HEALTH_CHANGED",
    source,
    payload,
  } as PublishInput<"WORKER_HEALTH_CHANGED">);
}
