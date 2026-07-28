/** Task Queue — Event Bus adapter (Epic 4.4). */

import type { RuntimeEventBus, PublishInput, RuntimeEventType } from "../event-bus/types";
import type { QueueTask } from "./types";
import type { QueueTaskStatus } from "./task-status";

export type TaskQueueEventType =
  | "TASK_CREATED"
  | "TASK_READY"
  | "TASK_STARTED"
  | "TASK_COMPLETED"
  | "TASK_FAILED"
  | "TASK_RETRY"
  | "TASK_CANCELLED"
  | "TASK_DEAD_LETTER"
  | "TASK_TIMEOUT";

export interface TaskQueueEventPayload {
  taskId: string;
  ventureId: string;
  taskType: string;
  priority: string;
  status: QueueTaskStatus;
  recommendedWorkerId?: string | null;
  attemptCount?: number;
  error?: string;
  workerId?: string;
}

function publishTaskEvent(
  bus: RuntimeEventBus,
  type: RuntimeEventType,
  source: string,
  task: QueueTask,
  extra?: Partial<TaskQueueEventPayload>,
): void {
  const payload: TaskQueueEventPayload = {
    taskId: task.id,
    ventureId: task.ventureId,
    taskType: String(task.type),
    priority: task.priority,
    status: task.status,
    recommendedWorkerId: task.recommendedWorkerId,
    attemptCount: task.attemptCount,
    ...extra,
  };

  bus.publish({
    type,
    source,
    payload,
  } as PublishInput<typeof type>);
}

export function publishTaskCreated(
  bus: RuntimeEventBus,
  source: string,
  task: QueueTask,
): void {
  publishTaskEvent(bus, "TASK_CREATED", source, task);
}

export function publishTaskReady(
  bus: RuntimeEventBus,
  source: string,
  task: QueueTask,
): void {
  publishTaskEvent(bus, "TASK_READY", source, { ...task, status: "READY" });
}

export function publishTaskStarted(
  bus: RuntimeEventBus,
  source: string,
  task: QueueTask,
  workerId: string,
): void {
  publishTaskEvent(bus, "TASK_STARTED", source, { ...task, status: "RUNNING" }, { workerId });
}

export function publishTaskCompleted(
  bus: RuntimeEventBus,
  source: string,
  task: QueueTask,
  workerId?: string,
): void {
  publishTaskEvent(bus, "TASK_COMPLETED", source, { ...task, status: "COMPLETED" }, { workerId });
}

export function publishTaskFailed(
  bus: RuntimeEventBus,
  source: string,
  task: QueueTask,
  error: string,
  workerId?: string,
): void {
  publishTaskEvent(bus, "TASK_FAILED", source, { ...task, status: "FAILED" }, { error, workerId });
}

export function publishTaskRetry(
  bus: RuntimeEventBus,
  source: string,
  task: QueueTask,
): void {
  publishTaskEvent(bus, "TASK_RETRY", source, { ...task, status: "RETRYING" });
}

export function publishTaskCancelled(
  bus: RuntimeEventBus,
  source: string,
  task: QueueTask,
): void {
  publishTaskEvent(bus, "TASK_CANCELLED", source, { ...task, status: "CANCELLED" });
}

export function publishTaskDeadLetter(
  bus: RuntimeEventBus,
  source: string,
  task: QueueTask,
  cause: string,
  workerId?: string,
): void {
  publishTaskEvent(bus, "TASK_DEAD_LETTER", source, { ...task, status: "DEAD_LETTER" }, {
    error: cause,
    workerId,
  });
}

export function publishTaskTimeout(
  bus: RuntimeEventBus,
  source: string,
  task: QueueTask,
  workerId?: string,
): void {
  publishTaskEvent(bus, "TASK_TIMEOUT", source, { ...task, status: "TIMEOUT" }, { workerId });
}

const STATUS_TO_EVENT: Partial<Record<QueueTaskStatus, TaskQueueEventType>> = {
  READY: "TASK_READY",
  RUNNING: "TASK_STARTED",
  COMPLETED: "TASK_COMPLETED",
  FAILED: "TASK_FAILED",
  RETRYING: "TASK_RETRY",
  CANCELLED: "TASK_CANCELLED",
  DEAD_LETTER: "TASK_DEAD_LETTER",
  TIMEOUT: "TASK_TIMEOUT",
};

export function publishTaskStatusChange(
  bus: RuntimeEventBus,
  source: string,
  task: QueueTask,
  context?: { workerId?: string; error?: string },
): void {
  if (task.status === "PENDING" || task.status === "BLOCKED" || task.status === "WAITING") {
    return;
  }

  const eventType = STATUS_TO_EVENT[task.status];
  if (!eventType) return;

  if (task.status === "FAILED") {
    publishTaskFailed(bus, source, task, context?.error ?? task.lastError ?? "Unknown error", context?.workerId);
    return;
  }

  publishTaskEvent(bus, eventType, source, task, {
    workerId: context?.workerId,
    error: context?.error,
  });
}
