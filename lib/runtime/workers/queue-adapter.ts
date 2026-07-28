/** ForgeOS Worker Runtime — Task Queue adapter (Epic 4.4). */

import {
  createRuntimeTaskQueue,
  type RuntimeTaskQueue,
  type QueueTask,
  type QueueTaskPriority,
  type QueueTaskType,
} from "../task-queue";
import type { SupportedTask } from "./types";

export interface QueuedWorkerTask {
  id: string;
  workerId: string;
  taskType: SupportedTask;
  ventureId: string;
  enqueuedAt: string;
  priority: number;
  queueTaskId: string;
  status: string;
}

export interface WorkerQueueAdapter {
  enqueue(task: Omit<QueuedWorkerTask, "id" | "enqueuedAt" | "queueTaskId" | "status" | "priority"> & {
    priority?: QueueTaskPriority;
  }): QueuedWorkerTask;
  dequeue(workerId?: string): QueuedWorkerTask | null;
  peek(limit?: number): QueuedWorkerTask[];
  size(): number;
  clear(): void;
  getQueue(): RuntimeTaskQueue;
}

function mapQueueTaskToWorkerTask(task: QueueTask, workerId: string): QueuedWorkerTask {
  const weightMap: Record<QueueTaskPriority, number> = {
    P0_CRITICAL: 1000,
    P1_HIGH: 750,
    P2_MEDIUM: 500,
    P3_LOW: 250,
  };
  return {
    id: `wq_${task.id}`,
    queueTaskId: task.id,
    workerId: task.recommendedWorkerId ?? workerId,
    taskType: task.type as SupportedTask,
    ventureId: task.ventureId,
    enqueuedAt: task.enqueuedAt,
    priority: weightMap[task.priority],
    status: task.status,
  };
}

export function createWorkerQueueAdapter(queue?: RuntimeTaskQueue): WorkerQueueAdapter {
  const taskQueue = queue ?? createRuntimeTaskQueue();

  return {
    enqueue(task) {
      const qt = taskQueue.enqueue({
        type: task.taskType as QueueTaskType,
        ventureId: task.ventureId,
        priority: task.priority ?? "P2_MEDIUM",
        recommendedWorkerId: task.workerId,
      });
      return mapQueueTaskToWorkerTask(qt, task.workerId);
    },

    dequeue(workerId) {
      const next = taskQueue.getNextTask(workerId ? { workerId } : undefined);
      if (!next) return null;
      return mapQueueTaskToWorkerTask(next, workerId ?? next.recommendedWorkerId ?? "unknown");
    },

    peek(limit) {
      const tasks = taskQueue.getTasks({ status: ["READY", "RETRYING", "PENDING"] });
      const slice = limit !== undefined ? tasks.slice(0, limit) : tasks;
      return slice.map((t) =>
        mapQueueTaskToWorkerTask(t, t.recommendedWorkerId ?? "unknown"),
      );
    },

    size() {
      return taskQueue.getTasks().length;
    },

    clear() {
      taskQueue.clear();
    },

    getQueue() {
      return taskQueue;
    },
  };
}

/** @deprecated Use createWorkerQueueAdapter */
export function createStubWorkerQueueAdapter(): WorkerQueueAdapter {
  return createWorkerQueueAdapter();
}
