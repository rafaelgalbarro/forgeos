/** ForgeOS Worker Runtime — internal worker lifecycle events (Epic 4.3). */

import type { WorkerHealthLevel } from "./health";
import type { WorkerStatus } from "./worker-status";
import type { SupportedTask } from "./types";

export type WorkerLifecycleEventType =
  | "WORKER_REGISTERED"
  | "WORKER_STARTED"
  | "WORKER_COMPLETED"
  | "WORKER_FAILED"
  | "WORKER_BLOCKED"
  | "WORKER_PAUSED"
  | "WORKER_RESUMED"
  | "WORKER_HEALTH_CHANGED";

export interface WorkerRegisteredPayload {
  workerId: string;
  name: string;
  department: string;
  version: string;
}

export interface WorkerExecutionPayload {
  workerId: string;
  ventureId: string;
  taskType: SupportedTask;
  taskId?: string;
}

export interface WorkerStatusPayload {
  workerId: string;
  ventureId?: string;
  from: WorkerStatus;
  to: WorkerStatus;
  reason: string;
}

export interface WorkerHealthChangedPayload {
  workerId: string;
  from: WorkerHealthLevel;
  to: WorkerHealthLevel;
  reason: string;
}

export interface WorkerLifecycleEventPayloadMap {
  WORKER_REGISTERED: WorkerRegisteredPayload;
  WORKER_STARTED: WorkerExecutionPayload;
  WORKER_COMPLETED: WorkerExecutionPayload & { durationMs: number };
  WORKER_FAILED: WorkerExecutionPayload & { error: string; durationMs: number };
  WORKER_BLOCKED: WorkerStatusPayload;
  WORKER_PAUSED: WorkerStatusPayload;
  WORKER_RESUMED: WorkerStatusPayload;
  WORKER_HEALTH_CHANGED: WorkerHealthChangedPayload;
}

export const WORKER_LIFECYCLE_EVENT_LABELS: Record<WorkerLifecycleEventType, string> = {
  WORKER_REGISTERED: "Worker Registered",
  WORKER_STARTED: "Worker Started",
  WORKER_COMPLETED: "Worker Completed",
  WORKER_FAILED: "Worker Failed",
  WORKER_BLOCKED: "Worker Blocked",
  WORKER_PAUSED: "Worker Paused",
  WORKER_RESUMED: "Worker Resumed",
  WORKER_HEALTH_CHANGED: "Worker Health Changed",
};
