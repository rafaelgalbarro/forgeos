/** ForgeOS Worker Runtime — public API (Epic 4.3). */

export type {
  WorkerDepartment,
  WorkerTaskType,
  SupportedTask,
  WorkerCapability,
  WorkerHealthSnapshot,
  WorkerDefinition,
  WorkerInstance,
  WorkerTaskRequest,
  WorkerTaskResult,
  WorkerRegistryQuery,
  WorkerRegistry,
} from "./types";

export type { WorkerStatus, WorkerStatusTransition } from "./worker-status";
export {
  WORKER_STATUS_LABELS,
  canTransitionStatus,
  transitionStatus,
  getStatusTransitionHistory,
  clearStatusTransitionHistory,
  getAllowedTargetStatuses,
} from "./worker-status";

export type { WorkerHealthLevel, WorkerHealthMetrics } from "./health";
export {
  HEALTH_LEVEL_LABELS,
  createInitialHealthMetrics,
  computeAvgExecutionMs,
  computeHealthLevel,
  recordExecutionSuccess,
  recordExecutionFailure,
} from "./health";

export { CAPABILITY_CATALOG, cap } from "./worker-capabilities";
export type { WorkerLifecycleEventType } from "./worker-events";
export { WORKER_LIFECYCLE_EVENT_LABELS } from "./worker-events";

export {
  createWorkerInstance,
  toHealthSnapshot,
  updateWorkerStatus,
  supportsTask,
  isAllowedInState,
  hasCapability,
} from "./worker";

export { createWorkerRegistry } from "./worker-registry";
export { OFFICIAL_WORKERS, registerOfficialWorkers, getOfficialWorkerDefinition } from "./worker-factory";
export { createWorkerContext } from "./worker-context";
export type { WorkerRuntimeContext } from "./worker-context";

export { createWorkerRunner, clearRunnerHealthMetrics } from "./worker-runner";
export type { WorkerRunner, WorkerRunnerValidation } from "./worker-runner";

export { computeWorkerMetrics } from "./metrics";
export type { WorkerRuntimeMetrics } from "./metrics";

export { createWorkerTelemetryStore } from "./telemetry";
export type { WorkerTelemetryRecord, WorkerTelemetryStore } from "./telemetry";

export {
  publishWorkerRegistered,
  publishWorkerStarted,
  publishWorkerCompleted,
  publishWorkerFailed,
  publishWorkerBlocked,
  publishWorkerPaused,
  publishWorkerResumed,
  publishWorkerHealthChanged,
} from "./eventbus-adapter";

export {
  checkSchedulerEligibility,
  whoCanExecute,
  getRecommendedWorker,
  getWorkersForSchedulerTask,
} from "./scheduler-adapter";
export type { SchedulerEligibilityResult } from "./scheduler-adapter";

export {
  checkStateMachineEligibility,
  getVentureState,
  filterWorkersByVentureState,
  validateWorkerForState,
} from "./state-machine-adapter";
export type { StateMachineEligibilityResult } from "./state-machine-adapter";

export { createWorkerQueueAdapter, createStubWorkerQueueAdapter } from "./queue-adapter";
export type { WorkerQueueAdapter, QueuedWorkerTask } from "./queue-adapter";
