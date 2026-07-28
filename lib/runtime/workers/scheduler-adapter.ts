/** ForgeOS Worker Runtime — Scheduler adapter (Epic 4.3). */

import type { RuntimeScheduler } from "../scheduler/types";
import type { SchedulerTaskType, TaskPriority } from "../scheduler/types";
import type { WorkerInstance, SupportedTask } from "./types";

export interface SchedulerEligibilityResult {
  eligible: boolean;
  workerId: string;
  taskType: SupportedTask;
  priority: TaskPriority;
  missingDependencies: string[];
  blockedReasons: string[];
  matchingSchedulerTaskId: string | null;
}

/** Maps scheduler task types to worker IDs that can execute them. */
const TASK_TO_WORKER_IDS: Partial<Record<SchedulerTaskType, string[]>> = {
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
};

export function getWorkersForSchedulerTask(
  workers: WorkerInstance[],
  taskType: SchedulerTaskType,
): WorkerInstance[] {
  const ids = TASK_TO_WORKER_IDS[taskType] ?? [];
  return workers.filter((w) => ids.includes(w.id) && w.supportedTasks.includes(taskType));
}

export function checkSchedulerEligibility(
  scheduler: RuntimeScheduler,
  worker: WorkerInstance,
  taskType: SupportedTask,
  ventureId: string,
): SchedulerEligibilityResult {
  const blockedReasons: string[] = [];
  const missingDependencies: string[] = [];
  let matchingSchedulerTaskId: string | null = null;

  const ventureTasks = scheduler.getTasks({ ventureId });
  const schedulerTask = ventureTasks.find(
    (t) => t.type === taskType || t.label.toLowerCase().includes(String(taskType).toLowerCase()),
  );

  if (schedulerTask) {
    matchingSchedulerTaskId = schedulerTask.id;
    if (schedulerTask.status === "blocked") {
      blockedReasons.push(`Scheduler task ${schedulerTask.id} is blocked`);
      for (const depId of schedulerTask.dependsOn) {
        const dep = scheduler.getTask(depId);
        if (dep && dep.status !== "completed") {
          missingDependencies.push(depId);
        }
      }
    }
    if (schedulerTask.status === "cancelled" || schedulerTask.status === "failed") {
      blockedReasons.push(`Scheduler task status: ${schedulerTask.status}`);
    }
  }

  if (!worker.supportedTasks.includes(taskType)) {
    blockedReasons.push(`Worker does not support task: ${taskType}`);
  }

  const plan = scheduler.getExecutionPlan(ventureId);
  if (plan && matchingSchedulerTaskId && plan.blockedTaskIds.includes(matchingSchedulerTaskId)) {
    blockedReasons.push("Task is in blocked wave of execution plan");
  }

  return {
    eligible: blockedReasons.length === 0 && missingDependencies.length === 0,
    workerId: worker.id,
    taskType,
    priority: worker.priority,
    missingDependencies,
    blockedReasons,
    matchingSchedulerTaskId,
  };
}

export function whoCanExecute(
  scheduler: RuntimeScheduler,
  workers: WorkerInstance[],
  taskType: SupportedTask,
  ventureId: string,
): SchedulerEligibilityResult[] {
  const candidates = workers.filter((w) => w.supportedTasks.includes(taskType));
  return candidates.map((w) => checkSchedulerEligibility(scheduler, w, taskType, ventureId));
}

export function getRecommendedWorker(
  results: SchedulerEligibilityResult[],
): SchedulerEligibilityResult | null {
  const eligible = results.filter((r) => r.eligible);
  if (eligible.length === 0) return null;
  const priorityOrder: TaskPriority[] = ["P0_CRITICAL", "P1_HIGH", "P2_MEDIUM", "P3_LOW"];
  eligible.sort((a, b) => priorityOrder.indexOf(a.priority) - priorityOrder.indexOf(b.priority));
  return eligible[0];
}
