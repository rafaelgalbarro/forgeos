/** ForgeOS Execution Engine — Task Queue adapter (Epic 4.5). */

import type { RuntimeTaskQueue, QueueTask } from "../task-queue/types";
import {
  publishTaskStarted,
  publishTaskCompleted,
  publishTaskFailed,
  publishTaskStatusChange,
} from "../task-queue/eventbus-adapter";
import type { RuntimeEventBus } from "../event-bus/types";

export function selectReadyTask(
  queue: RuntimeTaskQueue,
  ventureId: string,
  workerId?: string,
): QueueTask | null {
  return queue.getNextTask({ ventureId, workerId });
}

export function markTaskRunning(
  queue: RuntimeTaskQueue,
  bus: RuntimeEventBus,
  source: string,
  taskId: string,
  workerId: string,
): QueueTask | null {
  const updated = queue.updateStatus(taskId, "RUNNING", {
    workerId,
    reason: "Execution engine dispatched",
  });
  if (updated) {
    publishTaskStarted(bus, source, updated, workerId);
  }
  return updated;
}

export function markTaskCompleted(
  queue: RuntimeTaskQueue,
  bus: RuntimeEventBus,
  source: string,
  taskId: string,
  workerId: string,
  durationMs: number,
): QueueTask | null {
  const updated = queue.updateStatus(taskId, "COMPLETED", {
    workerId,
    reason: "Execution completed",
    durationMs,
  });
  if (updated) {
    publishTaskCompleted(bus, source, updated, workerId);
  }
  return updated;
}

export function markTaskFailed(
  queue: RuntimeTaskQueue,
  bus: RuntimeEventBus,
  source: string,
  taskId: string,
  workerId: string,
  error: string,
): QueueTask | null {
  const updated = queue.updateStatus(taskId, "FAILED", {
    workerId,
    reason: "Execution failed",
    error,
  });
  if (updated) {
    publishTaskStatusChange(bus, source, updated, { workerId, error });
  }
  return updated;
}

export function getQueueSnapshot(
  queue: RuntimeTaskQueue,
  ventureId: string,
) {
  return queue.getSnapshot(ventureId);
}
