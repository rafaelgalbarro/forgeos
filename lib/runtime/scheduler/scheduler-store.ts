/** In-memory task store for the runtime scheduler (Epic 4.1). */

import type { SchedulerTask, TaskPriority, TaskStatus } from "./types";

const DEFAULT_MAX_TASKS = 2000;

let taskCounter = 0;

export function nextTaskId(): string {
  taskCounter += 1;
  return `task_${Date.now()}_${taskCounter}`;
}

/** @internal Reset id counter for deterministic tests. */
export function __resetTaskIdCounterForTests(): void {
  taskCounter = 0;
}

export class SchedulerStore {
  private tasks = new Map<string, SchedulerTask>();
  private readonly maxTasks: number;

  constructor(maxTasks = DEFAULT_MAX_TASKS) {
    this.maxTasks = maxTasks;
  }

  add(task: SchedulerTask): void {
    this.tasks.set(task.id, task);
    this.enforceLimit();
  }

  update(id: string, patch: Partial<SchedulerTask>): SchedulerTask | undefined {
    const existing = this.tasks.get(id);
    if (!existing) return undefined;

    const updated: SchedulerTask = {
      ...existing,
      ...patch,
      id: existing.id,
      updatedAt: new Date().toISOString(),
    };
    this.tasks.set(id, updated);
    return updated;
  }

  get(id: string): SchedulerTask | undefined {
    return this.tasks.get(id);
  }

  getAll(): SchedulerTask[] {
    return [...this.tasks.values()];
  }

  getByVenture(ventureId: string): SchedulerTask[] {
    return this.getAll().filter((t) => t.ventureId === ventureId);
  }

  getByType(type: SchedulerTask["type"], ventureId?: string): SchedulerTask[] {
    return this.getAll().filter(
      (t) => t.type === type && (ventureId ? t.ventureId === ventureId : true),
    );
  }

  getLatestByType(type: SchedulerTask["type"], ventureId: string): SchedulerTask | undefined {
    const matches = this.getByType(type, ventureId);
    if (matches.length === 0) return undefined;
    return matches.sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  }

  findIncompleteByType(type: SchedulerTask["type"], ventureId: string): SchedulerTask | undefined {
    return this.getByType(type, ventureId).find(
      (t) => t.status !== "completed" && t.status !== "cancelled",
    );
  }

  countByStatus(): Record<TaskStatus, number> {
    const counts: Record<TaskStatus, number> = {
      pending: 0,
      ready: 0,
      blocked: 0,
      running: 0,
      completed: 0,
      failed: 0,
      cancelled: 0,
    };

    for (const task of this.tasks.values()) {
      counts[task.status] += 1;
    }

    return counts;
  }

  countByPriority(): Record<TaskPriority, number> {
    const counts: Record<TaskPriority, number> = {
      P0_CRITICAL: 0,
      P1_HIGH: 0,
      P2_MEDIUM: 0,
      P3_LOW: 0,
    };

    for (const task of this.tasks.values()) {
      counts[task.priority] += 1;
    }

    return counts;
  }

  clear(): void {
    this.tasks.clear();
  }

  private enforceLimit(): void {
    if (this.tasks.size <= this.maxTasks) return;

    const sorted = this.getAll().sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    const excess = sorted.length - this.maxTasks;
    for (let i = 0; i < excess; i += 1) {
      this.tasks.delete(sorted[i].id);
    }
  }
}
