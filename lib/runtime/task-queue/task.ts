/** Task factory and labels (Epic 4.4). */

import type { SchedulerTaskType } from "../scheduler/types";
import type { RetryPolicyType } from "./retry-policy";
import { resolveMaxRetries } from "./retry-policy";
import type { QueueTaskPriority } from "./task-priority";
import { getPriorityMaxRetries, PRIORITY_CONFIG } from "./task-priority";
import { getMilestonesForTaskType } from "./task-dependencies";
import type { EnqueueTaskInput, QueueTask, QueueTaskType } from "./types";
import type { QueueTaskStatus } from "./task-status";
import { resolveInitialStatus } from "./task-status";

let taskCounter = 0;

export function nextTaskId(): string {
  taskCounter += 1;
  return `tq_${Date.now()}_${taskCounter}`;
}

export const QUEUE_TASK_LABELS: Record<QueueTaskType, string> = {
  DISCOVERY_REVIEW: "Discovery review",
  RESEARCH_RUN: "Research run",
  PRODUCT_UPDATE: "Product update",
  CEO_REVIEW: "CEO review",
  BOARD_REVIEW: "Board review",
  SIMULATOR_UPDATE: "Simulator update",
  BUILD_PLAN_UPDATE: "Build plan update",
  MEMORY_WRITE: "Memory write",
  RISK_REVIEW: "Risk review",
  OPPORTUNITY_REVIEW: "Opportunity review",
  BUILD: "Build",
  QA: "QA",
  LAUNCH: "Launch",
};

export function getTaskLabel(type: QueueTaskType): string {
  return QUEUE_TASK_LABELS[type] ?? String(type);
}

export interface CreateTaskOptions extends EnqueueTaskInput {
  dependsOn: string[];
  status: QueueTaskStatus;
  recommendedWorkerId?: string | null;
}

export function createQueueTask(options: CreateTaskOptions): QueueTask {
  const now = new Date().toISOString();
  const priority = options.priority ?? "P2_MEDIUM";
  const retryPolicy = options.retryPolicy ?? "MAX_3";
  const maxRetries = resolveMaxRetries(retryPolicy, priority);

  return {
    id: nextTaskId(),
    type: options.type,
    ventureId: options.ventureId,
    priority,
    status: options.status,
    retryPolicy,
    dependsOn: options.dependsOn,
    dependencyMilestones: getMilestonesForTaskType(options.type),
    schedulerTaskId: options.schedulerTaskId ?? null,
    sourceEventId: options.sourceEventId ?? null,
    recommendedWorkerId: options.recommendedWorkerId ?? null,
    label: options.label ?? getTaskLabel(options.type),
    attemptCount: 0,
    maxRetries,
    lastError: null,
    lastExecutionAt: null,
    enqueuedAt: now,
    startedAt: null,
    completedAt: null,
    updatedAt: now,
    queuePosition: null,
    metadata: options.metadata ?? {},
  };
}

export function buildTaskFromEnqueue(
  input: EnqueueTaskInput,
  dependsOn: string[],
  blocked: boolean,
): QueueTask {
  const waiting = false;
  const status = resolveInitialStatus(blocked, waiting);
  return createQueueTask({
    ...input,
    dependsOn,
    status: blocked ? "BLOCKED" : status === "PENDING" ? "READY" : status,
  });
}

export function schedulerTypeToQueueType(type: SchedulerTaskType): QueueTaskType {
  return type;
}

export function resetTaskIdCounter(): void {
  taskCounter = 0;
}
