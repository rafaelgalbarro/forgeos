/** Internal queue lifecycle events (Epic 4.4). */

import type { QueueTaskStatus } from "./task-status";
import type { QueueTask } from "./types";

export type QueueLifecycleEventType =
  | "enqueued"
  | "status_changed"
  | "priority_changed"
  | "retry_scheduled"
  | "dead_lettered"
  | "cancelled";

export interface QueueLifecycleEvent {
  type: QueueLifecycleEventType;
  taskId: string;
  timestamp: string;
  fromStatus?: QueueTaskStatus;
  toStatus?: QueueTaskStatus;
  reason?: string;
  task?: QueueTask;
}

export type QueueLifecycleHandler = (event: QueueLifecycleEvent) => void;

export class QueueEventEmitter {
  private handlers = new Set<QueueLifecycleHandler>();

  subscribe(handler: QueueLifecycleHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  emit(event: QueueLifecycleEvent): void {
    for (const handler of this.handlers) {
      handler(event);
    }
  }

  clear(): void {
    this.handlers.clear();
  }
}
