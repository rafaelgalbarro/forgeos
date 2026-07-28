/** Task Queue — Worker adapter (Epic 4.4). No execution. */

import type { WorkerInstance, SupportedTask } from "../workers/types";
import type { RuntimeTaskQueue, QueueTask } from "./types";
import type { QueueTaskStatus } from "./task-status";

export interface WorkerQueueQuery {
  hasTasks: boolean;
  canExecute: boolean;
  isBlocked: boolean;
  readyCount: number;
  blockedCount: number;
  nextTask: QueueTask | null;
  blockedReasons: string[];
}

export function queryWorkerQueue(
  queue: RuntimeTaskQueue,
  worker: WorkerInstance,
  ventureId?: string,
): WorkerQueueQuery {
  const filter = ventureId ? { ventureId } : undefined;
  const tasks = queue.getTasks(filter);
  const workerTasks = tasks.filter(
    (t) =>
      !t.recommendedWorkerId ||
      t.recommendedWorkerId === worker.id ||
      worker.supportedTasks.includes(t.type as SupportedTask),
  );

  const ready = workerTasks.filter((t) => t.status === "READY" || t.status === "RETRYING");
  const blocked = workerTasks.filter((t) => t.status === "BLOCKED");
  const nextTask = queue.getNextTask({ ventureId, workerId: worker.id });

  const blockedReasons: string[] = [];
  if (blocked.length > 0) {
    blockedReasons.push(`${blocked.length} task(s) blocked by dependencies`);
  }
  if (ready.length === 0 && workerTasks.length > 0) {
    blockedReasons.push("No ready tasks for this worker");
  }
  if (!worker.supportedTasks.length) {
    blockedReasons.push("Worker has no supported tasks");
  }

  const hasTasks = workerTasks.length > 0;
  const canExecute = ready.length > 0 && nextTask !== null;
  const isBlocked = blocked.length > 0 && ready.length === 0;

  return {
    hasTasks,
    canExecute,
    isBlocked,
    readyCount: ready.length,
    blockedCount: blocked.length,
    nextTask,
    blockedReasons,
  };
}

export function canWorkerExecuteTask(
  queue: RuntimeTaskQueue,
  worker: WorkerInstance,
  taskId: string,
): boolean {
  const task = queue.getTask(taskId);
  if (!task) return false;
  if (task.status !== "READY" && task.status !== "RETRYING") return false;
  if (!worker.supportedTasks.includes(task.type as SupportedTask)) return false;
  if (task.recommendedWorkerId && task.recommendedWorkerId !== worker.id) return false;
  return true;
}

export function getWorkerReadyTasks(
  queue: RuntimeTaskQueue,
  worker: WorkerInstance,
  ventureId?: string,
): QueueTask[] {
  const filter = ventureId
    ? { ventureId, status: ["READY", "RETRYING"] as QueueTaskStatus[] }
    : { status: ["READY", "RETRYING"] as QueueTaskStatus[] };
  return queue.getTasks(filter).filter(
    (t) =>
      worker.supportedTasks.includes(t.type as SupportedTask) &&
      (!t.recommendedWorkerId || t.recommendedWorkerId === worker.id),
  );
}

export function areTasksBlockedForWorker(
  queue: RuntimeTaskQueue,
  worker: WorkerInstance,
  ventureId?: string,
): boolean {
  const query = queryWorkerQueue(queue, worker, ventureId);
  return query.isBlocked;
}
