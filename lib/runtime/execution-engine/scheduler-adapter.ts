/** ForgeOS Execution Engine — Scheduler adapter (Epic 4.5). */

import type { RuntimeScheduler } from "../scheduler/types";
import type { RuntimeTaskQueue } from "../task-queue/types";
import type { WorkerInstance } from "../workers/types";
import {
  getSchedulerQueuePlan,
  planSchedulerTasksIntoQueue,
} from "../task-queue/scheduler-adapter";

export function consultScheduler(
  scheduler: RuntimeScheduler,
  queue: RuntimeTaskQueue,
  workers: WorkerInstance[],
  ventureId: string,
): ReturnType<typeof getSchedulerQueuePlan> {
  planSchedulerTasksIntoQueue(scheduler, queue, workers, ventureId);
  return getSchedulerQueuePlan(queue, ventureId);
}

export function getSchedulerTaskCreatedAt(
  scheduler: RuntimeScheduler,
  schedulerTaskId: string | null,
): string | null {
  if (!schedulerTaskId) return null;
  const task = scheduler.getTasks().find((t) => t.id === schedulerTaskId);
  return task?.createdAt ?? null;
}
