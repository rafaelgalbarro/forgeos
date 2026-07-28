/** Dead letter queue for exhausted retries (Epic 4.4). */

import type { QueueTaskType } from "./types";

export interface DeadLetterEntry {
  id: string;
  taskId: string;
  taskType: QueueTaskType;
  ventureId: string;
  workerId: string | null;
  cause: string;
  lastError: string | null;
  attemptCount: number;
  movedAt: string;
  label: string;
}

let deadLetterCounter = 0;

export function nextDeadLetterId(): string {
  deadLetterCounter += 1;
  return `dlq_${Date.now()}_${deadLetterCounter}`;
}

export function createDeadLetterEntry(
  task: {
    id: string;
    type: QueueTaskType;
    ventureId: string;
    label: string;
    attemptCount: number;
    lastError: string | null;
  },
  cause: string,
  workerId?: string | null,
): DeadLetterEntry {
  return {
    id: nextDeadLetterId(),
    taskId: task.id,
    taskType: task.type,
    ventureId: task.ventureId,
    workerId: workerId ?? null,
    cause,
    lastError: task.lastError,
    attemptCount: task.attemptCount,
    movedAt: new Date().toISOString(),
    label: task.label,
  };
}

export class DeadLetterStore {
  private entries: DeadLetterEntry[] = [];

  add(entry: DeadLetterEntry): DeadLetterEntry {
    this.entries.push(entry);
    return entry;
  }

  list(ventureId?: string): DeadLetterEntry[] {
    if (!ventureId) return [...this.entries];
    return this.entries.filter((e) => e.ventureId === ventureId);
  }

  findByTaskId(taskId: string): DeadLetterEntry | undefined {
    return this.entries.find((e) => e.taskId === taskId);
  }

  clear(): void {
    this.entries = [];
  }

  size(): number {
    return this.entries.length;
  }
}
