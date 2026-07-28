/** Pipeline and task-type dependency calculation (Epic 4.4). */

import type { SchedulerTaskType } from "../scheduler/types";
import { getDependencyTypesForTask } from "../scheduler/dependencies";
import type { QueueMilestoneType, QueueTask, QueueTaskType } from "./types";
import type { QueueTaskStatus } from "./task-status";

export interface PipelineDependencyRule {
  taskType: QueueTaskType;
  dependsOnMilestones: QueueMilestoneType[];
  dependsOnTypes?: QueueTaskType[];
}

/** BUILD → PRODUCT_COMPLETE, QA → BUILD_COMPLETE, LAUNCH → QA_COMPLETE */
export const PIPELINE_DEPENDENCY_RULES: PipelineDependencyRule[] = [
  { taskType: "BUILD", dependsOnMilestones: ["PRODUCT_COMPLETE"], dependsOnTypes: ["PRODUCT_UPDATE"] },
  { taskType: "QA", dependsOnMilestones: ["BUILD_COMPLETE"], dependsOnTypes: ["BUILD"] },
  { taskType: "LAUNCH", dependsOnMilestones: ["QA_COMPLETE"], dependsOnTypes: ["QA"] },
];

const MILESTONE_TO_TASK_TYPE: Record<QueueMilestoneType, QueueTaskType> = {
  PRODUCT_COMPLETE: "PRODUCT_UPDATE",
  BUILD_COMPLETE: "BUILD",
  QA_COMPLETE: "QA",
};

export function getMilestonesForTaskType(taskType: QueueTaskType): QueueMilestoneType[] {
  const rule = PIPELINE_DEPENDENCY_RULES.find((r) => r.taskType === taskType);
  return rule?.dependsOnMilestones ?? [];
}

export function getSchedulerDependencyTypes(taskType: QueueTaskType): QueueTaskType[] {
  if (taskType === "BUILD" || taskType === "QA" || taskType === "LAUNCH") {
    const rule = PIPELINE_DEPENDENCY_RULES.find((r) => r.taskType === taskType);
    return rule?.dependsOnTypes ?? [];
  }
  return getDependencyTypesForTask(taskType as SchedulerTaskType) as QueueTaskType[];
}

export function isMilestoneSatisfied(
  milestone: QueueMilestoneType,
  tasks: QueueTask[],
  ventureId: string,
): boolean {
  const requiredType = MILESTONE_TO_TASK_TYPE[milestone];
  return tasks.some(
    (t) =>
      t.ventureId === ventureId &&
      t.type === requiredType &&
      t.status === "COMPLETED",
  );
}

export function areMilestonesMet(
  task: Pick<QueueTask, "dependencyMilestones" | "ventureId">,
  tasks: QueueTask[],
): boolean {
  if (task.dependencyMilestones.length === 0) return true;
  return task.dependencyMilestones.every((m) =>
    isMilestoneSatisfied(m, tasks, task.ventureId),
  );
}

export function areTaskDependenciesMet(
  task: QueueTask,
  tasksById: Map<string, QueueTask>,
): boolean {
  if (task.dependsOn.length === 0) return true;
  return task.dependsOn.every((depId) => {
    const dep = tasksById.get(depId);
    return dep?.status === "COMPLETED";
  });
}

export function hasBlockingDependencies(
  task: QueueTask,
  tasks: QueueTask[],
  tasksById: Map<string, QueueTask>,
): boolean {
  if (!areMilestonesMet(task, tasks)) return true;
  if (!areTaskDependenciesMet(task, tasksById)) return true;
  return false;
}

export function resolveDependencyTaskIds(
  task: Pick<QueueTask, "type" | "ventureId" | "id">,
  ventureTasks: QueueTask[],
): string[] {
  const dependencyTypes = getSchedulerDependencyTypes(task.type);
  if (dependencyTypes.length === 0) return [];

  const candidates = ventureTasks.filter(
    (t) =>
      t.ventureId === task.ventureId &&
      t.id !== task.id &&
      dependencyTypes.includes(t.type),
  );

  const byType = new Map<QueueTaskType, QueueTask>();
  for (const candidate of candidates) {
    const existing = byType.get(candidate.type);
    if (!existing || candidate.enqueuedAt > existing.enqueuedAt) {
      byType.set(candidate.type, candidate);
    }
  }

  return [...byType.values()].map((t) => t.id);
}

export function resolveQueueStatusFromDependencies(
  task: QueueTask,
  tasks: QueueTask[],
  tasksById: Map<string, QueueTask>,
): QueueTaskStatus {
  if (isTerminalStatus(task.status)) return task.status;
  if (hasBlockingDependencies(task, tasks, tasksById)) return "BLOCKED";
  if (task.status === "WAITING") return "WAITING";
  return "READY";
}

function isTerminalStatus(status: QueueTaskStatus): boolean {
  return ["COMPLETED", "FAILED", "CANCELLED", "TIMEOUT", "DEAD_LETTER"].includes(status);
}
