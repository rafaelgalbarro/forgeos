/** ForgeOS Execution Engine — public API (Epic 4.5). */

export type {
  ExecutionSession,
  ExecutionSessionStatus,
  ExecutionSessionEvent,
  ExecutionResult,
  ExecutionEngine,
  ExecutionEngineContext,
  ExecutionEngineOptions,
  WorkerDispatchResult,
  TaskDispatchResult,
  StateValidationResult,
  FutureAdapterStub,
} from "./types";

export type { ExecutionPipelineState } from "./execution-status";
export {
  PIPELINE_STATE_LABELS,
  canTransitionPipeline,
  isTerminalPipelineState,
  isFailurePipelineState,
} from "./execution-status";

export type { ExecutionInternalEvent, ExecutionInternalEventType } from "./execution-events";
export { ExecutionEventEmitter } from "./execution-events";

export type { ExecutionHistoryEntry, WorkerHistoryEntry, TaskHistoryEntry } from "./execution-history";
export { ExecutionHistoryStore } from "./execution-history";

export { ExecutionStore, nextSessionId } from "./execution-store";

export type { ExecutionTelemetryRecord, ExecutionTelemetrySummary } from "./execution-telemetry";
export { ExecutionTelemetryStore } from "./execution-telemetry";

export type { ExecutionMetrics } from "./execution-metrics";
export {
  computeExecutionMetrics,
  computeQueueWaitMs,
  computeSchedulerDelayMs,
} from "./execution-metrics";

export {
  createExecutionSession,
  appendSessionEvent,
  transitionSessionPipeline,
  finishSession,
} from "./execution-session";

export { createExecutionContext, createWorkerRuntimeDeps } from "./execution-context";
export { createExecutionEngine } from "./execution-engine";
export { runSingleExecution } from "./execution-runner";

export { advancePipeline, getPipelineProgress, PIPELINE_SUCCESS_PATH } from "./execution-pipeline";

export { dispatchWorker, listCompatibleWorkers, WorkerUnavailableError } from "./worker-dispatcher";
export { dispatchTask } from "./task-dispatcher";

export { consultScheduler, getSchedulerTaskCreatedAt } from "./scheduler-adapter";
export {
  selectReadyTask,
  markTaskRunning,
  markTaskCompleted,
  markTaskFailed,
  getQueueSnapshot,
} from "./queue-adapter";
export {
  createExecutionWorkerRunner,
  executeWorkerTask,
  resolveVentureStateForExecution,
} from "./worker-adapter";

export type { ExecutionEventType } from "./eventbus-adapter";
export {
  publishSessionCreated,
  publishSessionFinished,
  publishExecutionStarted,
  publishExecutionFinished,
  publishExecutionFailed,
  publishWorkerDispatched,
  publishTaskExecuted,
  getExecutionEvents,
} from "./eventbus-adapter";

export type { ExecutionMemoryWrite } from "./memory-adapter";
export {
  writeExecutionMemory,
  getExecutionMemoryWrites,
  clearExecutionMemory,
} from "./memory-adapter";

export type { ExecutionDecisionWrite } from "./decision-graph-adapter";
export {
  writeExecutionDecision,
  getExecutionDecisionWrites,
  clearExecutionDecisions,
} from "./decision-graph-adapter";

export type { AiOrchestrationResult, AiOrchestrationAdapter } from "./ai-orchestration-adapter";
export { createAiOrchestrationAdapter } from "./ai-orchestration-adapter";

export {
  resolveVentureContextFlags,
  validateWorkerForVentureState,
  scoreWorkerCandidate,
  shouldRetryExecution,
} from "./execution-policies";
