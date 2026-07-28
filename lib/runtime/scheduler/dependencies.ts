/** Dependency graph calculation (Epic 4.1). */

import type { SchedulerTask, SchedulerTaskType, TaskDependencyRule } from "./types";

/** Static task-type dependency rules (calculate only — no execution). */
export const TASK_DEPENDENCY_RULES: TaskDependencyRule[] = [
  { taskType: "PRODUCT_UPDATE", dependsOnTypes: ["RESEARCH_RUN"] },
  { taskType: "BUILD_PLAN_UPDATE", dependsOnTypes: ["PRODUCT_UPDATE"] },
  { taskType: "BOARD_REVIEW", dependsOnTypes: ["CEO_REVIEW"] },
  { taskType: "SIMULATOR_UPDATE", dependsOnTypes: ["PRODUCT_UPDATE"] },
];

/** BUILD (if modeled) depends on BOARD_REVIEW + BUILD_PLAN_UPDATE — documented for future use. */
export const BUILD_DEPENDENCY_TYPES: SchedulerTaskType[] = ["BOARD_REVIEW", "BUILD_PLAN_UPDATE"];

export function getDependencyTypesForTask(taskType: SchedulerTaskType): SchedulerTaskType[] {
  const rule = TASK_DEPENDENCY_RULES.find((r) => r.taskType === taskType);
  return rule?.dependsOnTypes ?? [];
}

/** Resolve concrete task IDs this task depends on within the same venture. */
export function resolveTaskDependencies(
  task: Pick<SchedulerTask, "type" | "ventureId" | "id">,
  ventureTasks: SchedulerTask[],
): string[] {
  const dependencyTypes = getDependencyTypesForTask(task.type);
  if (dependencyTypes.length === 0) return [];

  const candidates = ventureTasks.filter(
    (t) =>
      t.ventureId === task.ventureId &&
      t.id !== task.id &&
      dependencyTypes.includes(t.type),
  );

  const byType = new Map<SchedulerTaskType, SchedulerTask>();
  for (const candidate of candidates) {
    const existing = byType.get(candidate.type);
    if (!existing || candidate.createdAt > existing.createdAt) {
      byType.set(candidate.type, candidate);
    }
  }

  return [...byType.values()].map((t) => t.id);
}

export function areDependenciesMet(
  task: SchedulerTask,
  tasksById: Map<string, SchedulerTask>,
): boolean {
  if (task.dependsOn.length === 0) return true;
  return task.dependsOn.every((depId) => {
    const dep = tasksById.get(depId);
    return dep?.status === "completed";
  });
}

export function hasBlockingDependencies(
  task: SchedulerTask,
  tasksById: Map<string, SchedulerTask>,
): boolean {
  if (task.dependsOn.length === 0) return false;
  return task.dependsOn.some((depId) => {
    const dep = tasksById.get(depId);
    return !dep || dep.status !== "completed";
  });
}

/** Topological ordering for tasks with dependency edges. */
export function topologicalSort(tasks: SchedulerTask[]): SchedulerTask[] {
  const byId = new Map(tasks.map((t) => [t.id, t]));
  const visited = new Set<string>();
  const visiting = new Set<string>();
  const sorted: SchedulerTask[] = [];

  function visit(task: SchedulerTask): void {
    if (visited.has(task.id)) return;
    if (visiting.has(task.id)) return;

    visiting.add(task.id);
    for (const depId of task.dependsOn) {
      const dep = byId.get(depId);
      if (dep) visit(dep);
    }
    visiting.delete(task.id);
    visited.add(task.id);
    sorted.push(task);
  }

  const priorityOrder = { P0_CRITICAL: 0, P1_HIGH: 1, P2_MEDIUM: 2, P3_LOW: 3 };

  const queue = [...tasks].sort((a, b) => {
    const p = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (p !== 0) return p;
    return a.createdAt.localeCompare(b.createdAt);
  });

  for (const task of queue) {
    visit(task);
  }

  return sorted;
}
