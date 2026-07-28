/** Task registry — CRUD, filter, cancel, query, history (Epic 4.4). */

import type { DeadLetterStore } from "./dead-letter";
import type { QueueStore } from "./queue-store";
import type { QueueTask, QueueTaskFilter, QueueTaskHistoryEntry } from "./types";
import type { QueueTaskPriority } from "./task-priority";
import type { QueueTaskStatus } from "./task-status";
import { canTransitionStatus } from "./task-status";

export interface TaskRegistry {
  create(task: QueueTask): QueueTask;
  find(id: string): QueueTask | undefined;
  filter(query: QueueTaskFilter): QueueTask[];
  cancel(id: string, reason?: string): QueueTask | null;
  query(ventureId: string): QueueTask[];
  update(task: QueueTask): QueueTask;
  history(taskId?: string): QueueTaskHistoryEntry[];
  changePriority(id: string, priority: QueueTaskPriority): QueueTask | null;
}

export function createTaskRegistry(
  store: QueueStore,
  deadLetter: DeadLetterStore,
): TaskRegistry {
  function recordTransition(
    taskId: string,
    from: QueueTaskStatus | null,
    to: QueueTaskStatus,
    reason: string,
    extra?: Partial<QueueTaskHistoryEntry>,
  ): void {
    store.recordHistory({
      taskId,
      fromStatus: from,
      toStatus: to,
      timestamp: new Date().toISOString(),
      reason,
      ...extra,
    });
  }

  return {
    create(task: QueueTask): QueueTask {
      store.add(task);
      recordTransition(task.id, null, task.status, "Task created");
      return task;
    },

    find(id: string): QueueTask | undefined {
      return store.get(id);
    },

    filter(query: QueueTaskFilter): QueueTask[] {
      return store.list(query);
    },

    cancel(id: string, reason = "Cancelled by registry"): QueueTask | null {
      const task = store.get(id);
      if (!task) return null;
      if (!canTransitionStatus(task.status, "CANCELLED")) return null;

      const updated: QueueTask = {
        ...task,
        status: "CANCELLED",
        updatedAt: new Date().toISOString(),
      };
      store.update(updated);
      recordTransition(id, task.status, "CANCELLED", reason);
      return updated;
    },

    query(ventureId: string): QueueTask[] {
      return store.list({ ventureId });
    },

    update(task: QueueTask): QueueTask {
      const existing = store.get(task.id);
      if (existing && existing.status !== task.status) {
        recordTransition(task.id, existing.status, task.status, "Task updated");
      }
      return store.update(task);
    },

    history(taskId?: string): QueueTaskHistoryEntry[] {
      return store.getHistory(taskId);
    },

    changePriority(id: string, priority: QueueTaskPriority): QueueTask | null {
      const task = store.get(id);
      if (!task) return null;
      const updated: QueueTask = {
        ...task,
        priority,
        updatedAt: new Date().toISOString(),
      };
      store.update(updated);
      recordTransition(id, task.status, task.status, `Priority changed to ${priority}`);
      return updated;
    },
  };
}
