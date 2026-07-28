/** In-memory task queue store (Epic 4.4). */

import type { DeadLetterStore } from "./dead-letter";
import type { QueueTask, QueueTaskFilter, QueueTaskHistoryEntry } from "./types";
import { compareQueuePriority } from "./task-priority";

export class QueueStore {
  private tasks = new Map<string, QueueTask>();
  private history: QueueTaskHistoryEntry[] = [];

  add(task: QueueTask): QueueTask {
    this.tasks.set(task.id, task);
    return task;
  }

  update(task: QueueTask): QueueTask {
    this.tasks.set(task.id, task);
    return task;
  }

  get(id: string): QueueTask | undefined {
    return this.tasks.get(id);
  }

  list(filter?: QueueTaskFilter): QueueTask[] {
    let result = [...this.tasks.values()];

    if (filter?.ventureId) {
      result = result.filter((t) => t.ventureId === filter.ventureId);
    }
    if (filter?.priority) {
      result = result.filter((t) => t.priority === filter.priority);
    }
    if (filter?.type) {
      result = result.filter((t) => t.type === filter.type);
    }
    if (filter?.recommendedWorkerId) {
      result = result.filter((t) => t.recommendedWorkerId === filter.recommendedWorkerId);
    }
    if (filter?.status) {
      const statuses = Array.isArray(filter.status) ? filter.status : [filter.status];
      result = result.filter((t) => statuses.includes(t.status));
    }

    return result.sort((a, b) => {
      const p = compareQueuePriority(a.priority, b.priority);
      if (p !== 0) return p;
      return a.enqueuedAt.localeCompare(b.enqueuedAt);
    });
  }

  recordHistory(entry: QueueTaskHistoryEntry): void {
    this.history.push(entry);
  }

  getHistory(taskId?: string): QueueTaskHistoryEntry[] {
    if (!taskId) return [...this.history];
    return this.history.filter((h) => h.taskId === taskId);
  }

  clear(): void {
    this.tasks.clear();
    this.history = [];
  }

  size(): number {
    return this.tasks.size;
  }

  assignQueuePositions(ventureId?: string): void {
    const ready = this.list({
      ventureId,
      status: ["READY", "PENDING", "RETRYING"],
    });
    ready.forEach((task, index) => {
      const updated = { ...task, queuePosition: index + 1, updatedAt: new Date().toISOString() };
      this.tasks.set(task.id, updated);
    });
  }
}

export interface QueueStoreSnapshot {
  tasks: QueueTask[];
  history: QueueTaskHistoryEntry[];
}

export function snapshotStore(store: QueueStore, deadLetter: DeadLetterStore, ventureId?: string): QueueStoreSnapshot {
  return {
    tasks: store.list(ventureId ? { ventureId } : undefined),
    history: store.getHistory(),
  };
}
