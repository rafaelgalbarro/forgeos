/** ForgeOS Task Queue — public API (Epic 4.4). */

export type {
  PipelineTaskType,
  QueueMilestoneType,
  QueueTaskType,
  QueueTask,
  QueueTaskFilter,
  QueueTaskHistoryEntry,
  QueueSnapshot,
  RuntimeTaskQueueOptions,
  RuntimeTaskQueue,
  EnqueueTaskInput,
  StatusUpdateContext,
} from "./types";

export type { QueueTaskStatus } from "./task-status";
export {
  QUEUE_STATUS_LABELS,
  TERMINAL_STATUSES,
  ACTIVE_STATUSES,
  isTerminalStatus,
  canTransitionStatus,
  resolveInitialStatus,
} from "./task-status";

export type { QueueTaskPriority, PriorityConfig } from "./task-priority";
export {
  PRIORITY_CONFIG,
  QUEUE_PRIORITY_LABELS,
  PRIORITY_ORDER,
  compareQueuePriority,
  getPriorityWeight,
  getPriorityTimeout,
  getPriorityMaxRetries,
} from "./task-priority";

export type { RetryPolicyType, RetryPolicyConfig } from "./retry-policy";
export {
  RETRY_POLICY_CONFIG,
  RETRY_POLICY_LABELS,
  resolveMaxRetries,
  computeRetryDelayMs,
  shouldRetry,
  hasExceededMaxRetries,
} from "./retry-policy";

export {
  PIPELINE_DEPENDENCY_RULES,
  getMilestonesForTaskType,
  getSchedulerDependencyTypes,
  isMilestoneSatisfied,
  areMilestonesMet,
  areTaskDependenciesMet,
  hasBlockingDependencies,
  resolveDependencyTaskIds,
  resolveQueueStatusFromDependencies,
} from "./task-dependencies";

export type { DeadLetterEntry } from "./dead-letter";
export { DeadLetterStore, createDeadLetterEntry, nextDeadLetterId } from "./dead-letter";

export { QUEUE_TASK_LABELS, getTaskLabel, createQueueTask, schedulerTypeToQueueType } from "./task";

export { QueueStore } from "./queue-store";
export type { QueueLifecycleEvent, QueueLifecycleEventType } from "./queue-events";
export { QueueEventEmitter } from "./queue-events";

export type { QueueMetrics } from "./queue-metrics";
export { computeQueueMetrics } from "./queue-metrics";

export type { QueueTelemetryRecord, QueueTelemetrySummary } from "./queue-telemetry";
export { QueueTelemetryStore, telemetryFromMetrics } from "./queue-telemetry";

export type { TaskRegistry } from "./task-registry";
export { createTaskRegistry } from "./task-registry";

export { createRuntimeTaskQueue, createConnectedTaskQueue } from "./task-queue";
export type { ConnectedRuntimeTaskQueue } from "./task-queue";

export type { SchedulerQueuePlan } from "./scheduler-adapter";
export {
  resolveRecommendedWorkerId,
  planSchedulerTasksIntoQueue,
  getSchedulerQueuePlan,
  mapSchedulerTaskToEnqueueInput,
} from "./scheduler-adapter";

export type { WorkerQueueQuery } from "./worker-adapter";
export {
  queryWorkerQueue,
  canWorkerExecuteTask,
  getWorkerReadyTasks,
  areTasksBlockedForWorker,
} from "./worker-adapter";

export type { TaskQueueEventType, TaskQueueEventPayload } from "./eventbus-adapter";
export {
  publishTaskCreated,
  publishTaskReady,
  publishTaskStarted,
  publishTaskCompleted,
  publishTaskFailed,
  publishTaskRetry,
  publishTaskCancelled,
  publishTaskDeadLetter,
  publishTaskTimeout,
  publishTaskStatusChange,
} from "./eventbus-adapter";
