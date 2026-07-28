/** Execution plan generation (Epic 4.1). */

import { comparePriority } from "./priority";
import {
  areDependenciesMet,
  hasBlockingDependencies,
  topologicalSort,
} from "./dependencies";
import type { ExecutionPlan, ExecutionPlanWave, SchedulerTask } from "./types";

let planCounter = 0;

function nextPlanId(): string {
  planCounter += 1;
  return `plan_${Date.now()}_${planCounter}`;
}

/** @internal Reset id counter for deterministic tests. */
export function __resetPlanIdCounterForTests(): void {
  planCounter = 0;
}

export function buildExecutionPlan(
  tasks: SchedulerTask[],
  ventureId?: string,
): ExecutionPlan {
  const scoped = ventureId
    ? tasks.filter((t) => t.ventureId === ventureId)
    : tasks;

  const active = scoped.filter(
    (t) => t.status !== "completed" && t.status !== "cancelled" && t.status !== "failed",
  );

  const sorted = topologicalSort(active).sort((a, b) => {
    const priorityCmp = comparePriority(a.priority, b.priority);
    if (priorityCmp !== 0) return priorityCmp;
    return a.createdAt.localeCompare(b.createdAt);
  });

  const tasksById = new Map(scoped.map((t) => [t.id, t]));
  const readyTaskIds: string[] = [];
  const blockedTaskIds: string[] = [];

  for (const task of active) {
    if (hasBlockingDependencies(task, tasksById)) {
      blockedTaskIds.push(task.id);
    } else if (areDependenciesMet(task, tasksById) && (task.status === "ready" || task.status === "pending")) {
      readyTaskIds.push(task.id);
    }
  }

  const waves = buildWaves(sorted, tasksById);

  return {
    id: nextPlanId(),
    ventureId: ventureId ?? null,
    orderedTaskIds: sorted.map((t) => t.id),
    waves,
    readyTaskIds,
    blockedTaskIds,
    generatedAt: new Date().toISOString(),
  };
}

function buildWaves(
  sorted: SchedulerTask[],
  tasksById: Map<string, SchedulerTask>,
): ExecutionPlanWave[] {
  const waves: ExecutionPlanWave[] = [];
  const assigned = new Set<string>();

  for (const task of sorted) {
    if (assigned.has(task.id)) continue;

    const waveTaskIds: string[] = [];
    const canSchedule = sorted.filter(
      (candidate) =>
        !assigned.has(candidate.id) &&
        areDependenciesMet(candidate, tasksById) &&
        candidate.dependsOn.every((depId) => assigned.has(depId) || tasksById.get(depId)?.status === "completed"),
    );

    for (const candidate of canSchedule) {
      waveTaskIds.push(candidate.id);
      assigned.add(candidate.id);
    }

    if (waveTaskIds.length > 0) {
      waves.push({ waveIndex: waves.length, taskIds: waveTaskIds });
    } else if (!assigned.has(task.id)) {
      waves.push({ waveIndex: waves.length, taskIds: [task.id] });
      assigned.add(task.id);
    }
  }

  return waves;
}
