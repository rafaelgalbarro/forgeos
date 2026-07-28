/** ForgeOS Task Queue — main engine (Epic 4.4). */

import { DeadLetterStore, createDeadLetterEntry } from "./dead-letter";
import { QueueEventEmitter } from "./queue-events";
import { computeQueueMetrics } from "./queue-metrics";
import { QueueStore } from "./queue-store";
import { QueueTelemetryStore } from "./queue-telemetry";
import { createTaskRegistry } from "./task-registry";
import { buildTaskFromEnqueue, createQueueTask } from "./task";
import {
  hasBlockingDependencies,
  resolveDependencyTaskIds,
  resolveQueueStatusFromDependencies,
  getMilestonesForTaskType,
} from "./task-dependencies";
import { compareQueuePriority } from "./task-priority";
import { hasExceededMaxRetries, shouldRetry } from "./retry-policy";
import { canTransitionStatus } from "./task-status";
import type {
  EnqueueTaskInput,
  QueueSnapshot,
  QueueTask,
  RuntimeTaskQueue,
  RuntimeTaskQueueOptions,
  StatusUpdateContext,
} from "./types";
import type { QueueTaskPriority } from "./task-priority";
import type { QueueTaskStatus } from "./task-status";
import type { DeadLetterEntry } from "./dead-letter";

export function createRuntimeTaskQueue(
  options: RuntimeTaskQueueOptions = {},
): RuntimeTaskQueue {
  const maxTasks = options.maxTasks ?? 1000;
  const store = new QueueStore();
  const deadLetter = new DeadLetterStore();
  const registry = createTaskRegistry(store, deadLetter);
  const emitter = new QueueEventEmitter();
  const telemetry = new QueueTelemetryStore();

  function allTasks(): QueueTask[] {
    return store.list();
  }

  function tasksById(): Map<string, QueueTask> {
    return new Map(allTasks().map((t) => [t.id, t]));
  }

  function refreshDependencyStatus(task: QueueTask): QueueTask {
    const tasks = allTasks();
    const byId = tasksById();
    const newStatus = resolveQueueStatusFromDependencies(task, tasks, byId);
    if (newStatus !== task.status && canTransitionStatus(task.status, newStatus)) {
      const updated: QueueTask = {
        ...task,
        status: newStatus,
        updatedAt: new Date().toISOString(),
      };
      store.update(updated);
      store.recordHistory({
        taskId: task.id,
        fromStatus: task.status,
        toStatus: newStatus,
        timestamp: updated.updatedAt,
        reason: "Dependency resolution",
      });
      return updated;
    }
    return task;
  }

  function refreshAllDependencyStatuses(): void {
    for (const task of allTasks()) {
      if (!["COMPLETED", "CANCELLED", "DEAD_LETTER", "RUNNING"].includes(task.status)) {
        refreshDependencyStatus(task);
      }
    }
    store.assignQueuePositions();
  }

  function enqueue(input: EnqueueTaskInput): QueueTask {
    if (store.size() >= maxTasks) {
      throw new Error(`Task queue full (max ${maxTasks})`);
    }

    const ventureTasks = store.list({ ventureId: input.ventureId });
    const dependsOn =
      input.dependsOn ?? resolveDependencyTaskIds({ type: input.type, ventureId: input.ventureId, id: "" }, ventureTasks);
    const blocked = hasBlockingDependencies(
      {
        ...input,
        id: "",
        dependsOn,
        dependencyMilestones: getMilestonesForTaskType(input.type),
        status: "PENDING",
        retryPolicy: input.retryPolicy ?? "MAX_3",
        schedulerTaskId: input.schedulerTaskId ?? null,
        sourceEventId: input.sourceEventId ?? null,
        recommendedWorkerId: null,
        label: "",
        attemptCount: 0,
        maxRetries: 0,
        lastError: null,
        lastExecutionAt: null,
        enqueuedAt: "",
        startedAt: null,
        completedAt: null,
        updatedAt: "",
        queuePosition: null,
        metadata: input.metadata ?? {},
        priority: input.priority ?? "P2_MEDIUM",
      } as QueueTask,
      ventureTasks,
      new Map(ventureTasks.map((t) => [t.id, t])),
    );

    const task = buildTaskFromEnqueue(input, dependsOn, blocked);
    registry.create(task);
    refreshAllDependencyStatuses();

    emitter.emit({ type: "enqueued", taskId: task.id, timestamp: task.enqueuedAt, task });
    telemetry.record({
      taskId: task.id,
      ventureId: task.ventureId,
      event: "enqueued",
      queuePosition: task.queuePosition,
      recommendedWorkerId: task.recommendedWorkerId,
    });

    return store.get(task.id)!;
  }

  function enqueueFromScheduler(
    schedulerTaskId: string,
    input: Omit<EnqueueTaskInput, "schedulerTaskId">,
  ): QueueTask | null {
    const existing = allTasks().find((t) => t.schedulerTaskId === schedulerTaskId);
    if (existing) return existing;
    return enqueue({ ...input, schedulerTaskId });
  }

  function getNextTask(filter?: { ventureId?: string; workerId?: string }): QueueTask | null {
    refreshAllDependencyStatuses();
    let candidates = store.list({
      ventureId: filter?.ventureId,
      status: ["READY", "RETRYING"],
    });

    if (filter?.workerId) {
      candidates = candidates.filter(
        (t) => !t.recommendedWorkerId || t.recommendedWorkerId === filter.workerId,
      );
    }

    candidates.sort((a, b) => {
      const p = compareQueuePriority(a.priority, b.priority);
      if (p !== 0) return p;
      return a.enqueuedAt.localeCompare(b.enqueuedAt);
    });

    return candidates[0] ?? null;
  }

  function updateStatus(
    taskId: string,
    status: QueueTaskStatus,
    context: StatusUpdateContext = {},
  ): QueueTask | null {
    const task = store.get(taskId);
    if (!task) return null;
    if (!canTransitionStatus(task.status, status)) return null;

    const now = new Date().toISOString();
    const updated: QueueTask = {
      ...task,
      status,
      updatedAt: now,
      lastError: context.error ?? task.lastError,
      lastExecutionAt: context.workerId ? now : task.lastExecutionAt,
      startedAt: status === "RUNNING" ? now : task.startedAt,
      completedAt: ["COMPLETED", "FAILED", "CANCELLED", "TIMEOUT", "DEAD_LETTER"].includes(status)
        ? now
        : task.completedAt,
      attemptCount:
        status === "RUNNING" || status === "RETRYING"
          ? task.attemptCount + (status === "RUNNING" ? 1 : 0)
          : task.attemptCount,
      metadata: {
        ...task.metadata,
        ...(context.durationMs !== undefined ? { lastDurationMs: context.durationMs } : {}),
      },
    };

    store.update(updated);
    store.recordHistory({
      taskId,
      fromStatus: task.status,
      toStatus: status,
      timestamp: now,
      reason: context.reason ?? `Status → ${status}`,
      workerId: context.workerId,
      error: context.error,
    });

    if (status === "FAILED" || status === "TIMEOUT") {
      if (shouldRetry(task.retryPolicy, updated.attemptCount, task.priority)) {
        const retrying: QueueTask = { ...updated, status: "RETRYING", updatedAt: now };
        store.update(retrying);
        emitter.emit({ type: "retry_scheduled", taskId, timestamp: now, task: retrying });
        telemetry.record({
          taskId,
          ventureId: task.ventureId,
          event: "retry",
          retryAttempt: updated.attemptCount,
          failure: context.error,
        });
      } else if (hasExceededMaxRetries(updated.attemptCount, updated.maxRetries)) {
        moveToDeadLetter(taskId, context.error ?? "Max retries exceeded", context.workerId);
        return store.get(taskId) ?? null;
      }
    }

    refreshAllDependencyStatuses();
    emitter.emit({ type: "status_changed", taskId, timestamp: now, fromStatus: task.status, toStatus: status, task: updated });

    if (context.error) {
      telemetry.record({
        taskId,
        ventureId: task.ventureId,
        event: status,
        failure: context.error,
        recommendedWorkerId: task.recommendedWorkerId,
      });
    }

    return store.get(taskId)!;
  }

  function cancel(taskId: string, reason?: string): QueueTask | null {
    const result = registry.cancel(taskId, reason);
    if (result) {
      emitter.emit({ type: "cancelled", taskId, timestamp: result.updatedAt, task: result });
    }
    return result;
  }

  function moveToDeadLetter(
    taskId: string,
    cause: string,
    workerId?: string,
  ): DeadLetterEntry | null {
    const task = store.get(taskId);
    if (!task) return null;

    const entry = createDeadLetterEntry(task, cause, workerId);
    deadLetter.add(entry);

    const updated: QueueTask = {
      ...task,
      status: "DEAD_LETTER",
      updatedAt: entry.movedAt,
      lastError: cause,
    };
    store.update(updated);
    store.recordHistory({
      taskId,
      fromStatus: task.status,
      toStatus: "DEAD_LETTER",
      timestamp: entry.movedAt,
      reason: cause,
      workerId,
      error: cause,
    });

    emitter.emit({ type: "dead_lettered", taskId, timestamp: entry.movedAt, task: updated });
    telemetry.record({
      taskId,
      ventureId: task.ventureId,
      event: "dead_letter",
      failure: cause,
      recommendedWorkerId: workerId ?? task.recommendedWorkerId,
    });

    return entry;
  }

  function changePriority(taskId: string, priority: QueueTaskPriority): QueueTask | null {
    const result = registry.changePriority(taskId, priority);
    if (result) {
      store.assignQueuePositions();
      emitter.emit({
        type: "priority_changed",
        taskId,
        timestamp: result.updatedAt,
        task: result,
      });
    }
    return result;
  }

  function getSnapshot(ventureId?: string): QueueSnapshot {
    const tasks = ventureId ? store.list({ ventureId }) : store.list();
    const dl = ventureId ? deadLetter.list(ventureId) : deadLetter.list();
    const metrics = computeQueueMetrics(tasks, dl);
    return {
      tasks,
      deadLetter: dl,
      metrics,
      telemetry: telemetry.summarize(),
    };
  }

  function clear(): void {
    store.clear();
    deadLetter.clear();
    telemetry.clear();
  }

  return {
    enqueue,
    enqueueFromScheduler,
    getTask: (id) => store.get(id),
    getTasks: (filter) => store.list(filter),
    getNextTask,
    updateStatus,
    cancel,
    moveToDeadLetter,
    changePriority,
    getSnapshot,
    clear,
  };
}

/** Connected queue with event emitter access for adapters. */
export interface ConnectedRuntimeTaskQueue extends RuntimeTaskQueue {
  _internal?: {
    emitter: QueueEventEmitter;
    telemetry: QueueTelemetryStore;
    deadLetter: DeadLetterStore;
    store: QueueStore;
  };
}

export function createConnectedTaskQueue(
  options?: RuntimeTaskQueueOptions,
): ConnectedRuntimeTaskQueue {
  const queue = createRuntimeTaskQueue(options) as ConnectedRuntimeTaskQueue;
  return queue;
}
