/** Task Queue — Scheduler adapter (Epic 4.4). */

import type { RuntimeScheduler, SchedulerTask, SchedulerTaskType } from "../scheduler/types";
import type { RuntimeTaskQueue, QueueTask, QueueTaskType } from "./types";
import { schedulerTypeToQueueType } from "./task";
import { getRecommendedWorker } from "../workers/scheduler-adapter";
import type { WorkerInstance } from "../workers/types";

export interface SchedulerQueuePlan {
  nextTask: QueueTask | null;
  priority: QueueTask["priority"] | null;
  dependencies: string[];
  dependencyMilestones: QueueTask["dependencyMilestones"];
  recommendedWorkerId: string | null;
  blockedTaskIds: string[];
  readyTaskIds: string[];
}

const TASK_TO_WORKER_IDS: Partial<Record<QueueTaskType, string[]>> = {
  DISCOVERY_REVIEW: ["ceo", "research"],
  RESEARCH_RUN: ["research"],
  PRODUCT_UPDATE: ["product"],
  CEO_REVIEW: ["ceo"],
  BOARD_REVIEW: ["ceo"],
  SIMULATOR_UPDATE: ["finance", "growth", "analytics"],
  BUILD_PLAN_UPDATE: ["architecture", "cto", "build"],
  MEMORY_WRITE: ["knowledge"],
  RISK_REVIEW: ["finance", "legal", "ceo"],
  OPPORTUNITY_REVIEW: ["growth", "marketing", "capital"],
  BUILD: ["build", "engineering"],
  QA: ["quality"],
  LAUNCH: ["deployment", "growth"],
};

export function resolveRecommendedWorkerId(
  taskType: QueueTaskType,
  workers: WorkerInstance[],
): string | null {
  const ids = TASK_TO_WORKER_IDS[taskType] ?? [];
  const candidates = workers.filter((w) => ids.includes(w.id));
  if (candidates.length === 0) return ids[0] ?? null;

  const results = candidates.map((w) => ({
    eligible: true,
    workerId: w.id,
    taskType,
    priority: w.priority,
    missingDependencies: [] as string[],
    blockedReasons: [] as string[],
    matchingSchedulerTaskId: null,
  }));

  const recommended = getRecommendedWorker(results);
  return recommended?.workerId ?? candidates[0].id;
}

export function planSchedulerTasksIntoQueue(
  scheduler: RuntimeScheduler,
  queue: RuntimeTaskQueue,
  workers: WorkerInstance[],
  ventureId: string,
): QueueTask[] {
  const enqueued: QueueTask[] = [];
  const schedulerTasks = scheduler.getTasks({ ventureId });

  for (const st of schedulerTasks) {
    if (st.status === "cancelled") continue;

    const recommendedWorkerId = resolveRecommendedWorkerId(
      schedulerTypeToQueueType(st.type),
      workers,
    );

    const task = queue.enqueueFromScheduler(st.id, {
      type: schedulerTypeToQueueType(st.type),
      ventureId: st.ventureId,
      priority: st.priority,
      dependsOn: st.dependsOn,
      sourceEventId: st.sourceEventId,
      label: st.label,
      recommendedWorkerId,
      metadata: { ...st.metadata, schedulerStatus: st.status },
    });

    if (task) {
      enqueued.push(task);
    }
  }

  return enqueued;
}

export function getSchedulerQueuePlan(
  queue: RuntimeTaskQueue,
  ventureId?: string,
): SchedulerQueuePlan {
  const tasks = ventureId ? queue.getTasks({ ventureId }) : queue.getTasks();
  const nextTask = queue.getNextTask(ventureId ? { ventureId } : undefined);
  const blockedTaskIds = tasks.filter((t) => t.status === "BLOCKED").map((t) => t.id);
  const readyTaskIds = tasks.filter((t) => t.status === "READY").map((t) => t.id);

  return {
    nextTask,
    priority: nextTask?.priority ?? null,
    dependencies: nextTask?.dependsOn ?? [],
    dependencyMilestones: nextTask?.dependencyMilestones ?? [],
    recommendedWorkerId: nextTask?.recommendedWorkerId ?? null,
    blockedTaskIds,
    readyTaskIds,
  };
}

export function mapSchedulerTaskToEnqueueInput(
  st: SchedulerTask,
): Parameters<RuntimeTaskQueue["enqueueFromScheduler"]>[1] {
  return {
    type: schedulerTypeToQueueType(st.type),
    ventureId: st.ventureId,
    priority: st.priority,
    dependsOn: st.dependsOn,
    sourceEventId: st.sourceEventId,
    label: st.label,
    metadata: st.metadata,
  };
}
