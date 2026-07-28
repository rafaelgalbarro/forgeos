/** ForgeOS Task Queue — type contracts (Epic 4.4). */

import type { SchedulerTaskType } from "../scheduler/types";
import type { RetryPolicyType } from "./retry-policy";
import type { QueueTaskStatus } from "./task-status";
import type { QueueTaskPriority } from "./task-priority";

/** Pipeline stages beyond scheduler task types. */
export type PipelineTaskType = "BUILD" | "QA" | "LAUNCH";

/** Milestone markers for pipeline dependency resolution. */
export type QueueMilestoneType = "PRODUCT_COMPLETE" | "BUILD_COMPLETE" | "QA_COMPLETE";

export type QueueTaskType = SchedulerTaskType | PipelineTaskType;

export interface QueueTask {
  id: string;
  type: QueueTaskType;
  ventureId: string;
  priority: QueueTaskPriority;
  status: QueueTaskStatus;
  retryPolicy: RetryPolicyType;
  /** Concrete task IDs this task depends on. */
  dependsOn: string[];
  /** Milestone types that must be satisfied (calculate only). */
  dependencyMilestones: QueueMilestoneType[];
  /** Scheduler task ID when enqueued from scheduler. */
  schedulerTaskId: string | null;
  sourceEventId: string | null;
  recommendedWorkerId: string | null;
  label: string;
  attemptCount: number;
  maxRetries: number;
  lastError: string | null;
  lastExecutionAt: string | null;
  enqueuedAt: string;
  startedAt: string | null;
  completedAt: string | null;
  updatedAt: string;
  queuePosition: number | null;
  metadata: Record<string, unknown>;
}

export interface QueueTaskFilter {
  ventureId?: string;
  status?: QueueTaskStatus | QueueTaskStatus[];
  priority?: QueueTaskPriority;
  type?: QueueTaskType;
  recommendedWorkerId?: string;
}

export interface QueueTaskHistoryEntry {
  taskId: string;
  fromStatus: QueueTaskStatus | null;
  toStatus: QueueTaskStatus;
  timestamp: string;
  reason: string;
  workerId?: string;
  error?: string;
}

export interface QueueSnapshot {
  tasks: QueueTask[];
  deadLetter: import("./dead-letter").DeadLetterEntry[];
  metrics: import("./queue-metrics").QueueMetrics;
  telemetry: import("./queue-telemetry").QueueTelemetrySummary;
}

export interface RuntimeTaskQueueOptions {
  maxTasks?: number;
}

export interface RuntimeTaskQueue {
  enqueue(input: EnqueueTaskInput): QueueTask;
  enqueueFromScheduler(schedulerTaskId: string, input: Omit<EnqueueTaskInput, "schedulerTaskId">): QueueTask | null;
  getTask(id: string): QueueTask | undefined;
  getTasks(filter?: QueueTaskFilter): QueueTask[];
  getNextTask(filter?: { ventureId?: string; workerId?: string }): QueueTask | null;
  updateStatus(taskId: string, status: QueueTaskStatus, context?: StatusUpdateContext): QueueTask | null;
  cancel(taskId: string, reason?: string): QueueTask | null;
  moveToDeadLetter(taskId: string, cause: string, workerId?: string): import("./dead-letter").DeadLetterEntry | null;
  changePriority(taskId: string, priority: QueueTaskPriority): QueueTask | null;
  getSnapshot(ventureId?: string): QueueSnapshot;
  clear(): void;
}

export interface EnqueueTaskInput {
  type: QueueTaskType;
  ventureId: string;
  priority?: QueueTaskPriority;
  retryPolicy?: RetryPolicyType;
  schedulerTaskId?: string | null;
  sourceEventId?: string | null;
  recommendedWorkerId?: string | null;
  dependsOn?: string[];
  label?: string;
  metadata?: Record<string, unknown>;
}

export interface StatusUpdateContext {
  workerId?: string;
  error?: string;
  reason?: string;
  durationMs?: number;
}
