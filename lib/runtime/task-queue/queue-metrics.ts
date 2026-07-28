/** Task queue metrics (Epic 4.4). */

import type { DeadLetterEntry } from "./dead-letter";
import type { QueueTask, QueueTaskType } from "./types";
import type { QueueTaskStatus } from "./task-status";
import type { QueueTaskPriority } from "./task-priority";

export interface QueueMetrics {
  totalTasks: number;
  pending: number;
  ready: number;
  waiting: number;
  blocked: number;
  running: number;
  completed: number;
  failed: number;
  cancelled: number;
  timeout: number;
  retrying: number;
  deadLetter: number;
  avgWaitMs: number;
  maxWaitMs: number;
  avgExecutionMs: number;
  maxExecutionMs: number;
  retryCount: number;
  failureCount: number;
  warningCount: number;
  byPriority: Record<QueueTaskPriority, number>;
  byType: Partial<Record<QueueTaskType, number>>;
  recommendedWorkerCounts: Record<string, number>;
}

const EMPTY_BY_PRIORITY: Record<QueueTaskPriority, number> = {
  P0_CRITICAL: 0,
  P1_HIGH: 0,
  P2_MEDIUM: 0,
  P3_LOW: 0,
};

export function computeQueueMetrics(
  tasks: QueueTask[],
  deadLetter: DeadLetterEntry[],
): QueueMetrics {
  const byStatus = (status: QueueTaskStatus) => tasks.filter((t) => t.status === status).length;

  const waitTimes: number[] = [];
  const execTimes: number[] = [];
  let retryCount = 0;
  let failureCount = 0;
  let warningCount = 0;
  const byPriority = { ...EMPTY_BY_PRIORITY };
  const byType: Partial<Record<QueueTaskType, number>> = {};
  const recommendedWorkerCounts: Record<string, number> = {};

  const now = Date.now();

  for (const task of tasks) {
    byPriority[task.priority]++;
    byType[task.type] = (byType[task.type] ?? 0) + 1;

    if (task.recommendedWorkerId) {
      recommendedWorkerCounts[task.recommendedWorkerId] =
        (recommendedWorkerCounts[task.recommendedWorkerId] ?? 0) + 1;
    }

    retryCount += task.attemptCount;
    if (task.status === "FAILED" || task.status === "TIMEOUT") failureCount++;
    if (task.status === "BLOCKED" || task.status === "WAITING") warningCount++;

    if (task.startedAt) {
      const wait = new Date(task.startedAt).getTime() - new Date(task.enqueuedAt).getTime();
      if (wait >= 0) waitTimes.push(wait);
    } else if (["READY", "PENDING", "RETRYING"].includes(task.status)) {
      const wait = now - new Date(task.enqueuedAt).getTime();
      if (wait >= 0) waitTimes.push(wait);
    }

    if (task.startedAt && task.completedAt) {
      const exec =
        new Date(task.completedAt).getTime() - new Date(task.startedAt).getTime();
      if (exec >= 0) execTimes.push(exec);
    }
  }

  const avg = (arr: number[]) =>
    arr.length > 0 ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;
  const max = (arr: number[]) => (arr.length > 0 ? Math.max(...arr) : 0);

  return {
    totalTasks: tasks.length,
    pending: byStatus("PENDING"),
    ready: byStatus("READY"),
    waiting: byStatus("WAITING"),
    blocked: byStatus("BLOCKED"),
    running: byStatus("RUNNING"),
    completed: byStatus("COMPLETED"),
    failed: byStatus("FAILED"),
    cancelled: byStatus("CANCELLED"),
    timeout: byStatus("TIMEOUT"),
    retrying: byStatus("RETRYING"),
    deadLetter: deadLetter.length + byStatus("DEAD_LETTER"),
    avgWaitMs: avg(waitTimes),
    maxWaitMs: max(waitTimes),
    avgExecutionMs: avg(execTimes),
    maxExecutionMs: max(execTimes),
    retryCount,
    failureCount,
    warningCount,
    byPriority,
    byType,
    recommendedWorkerCounts,
  };
}
