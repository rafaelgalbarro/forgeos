/** ForgeOS Execution Engine — type contracts (Epic 4.5). */

import type { RuntimeEventBus } from "../event-bus/types";
import type { ConnectedRuntimeScheduler } from "../scheduler/scheduler";
import type { VentureStateMachine } from "../state-machine/types";
import type { RuntimeTaskQueue, QueueTask } from "../task-queue/types";
import type { WorkerRegistry, WorkerInstance, WorkerTaskResult } from "../workers/types";
import type { ExecutionPipelineState } from "./execution-status";
import type { ExecutionMemoryWrite } from "./memory-adapter";
import type { ExecutionDecisionWrite } from "./decision-graph-adapter";
import type { ExecutionTelemetryStore } from "./execution-telemetry";
import type { ExecutionStore } from "./execution-store";
import type { ExecutionHistoryStore } from "./execution-history";
import type { AiOrchestrationAdapter } from "./ai-orchestration-adapter";

export interface ExecutionSession {
  sessionId: string;
  ventureId: string;
  workerId: string;
  taskId: string;
  taskType: string;
  startedAt: string;
  finishedAt: string | null;
  status: ExecutionSessionStatus;
  pipelineState: ExecutionPipelineState;
  duration: number | null;
  warnings: string[];
  errors: string[];
  events: ExecutionSessionEvent[];
  memoryWrites: ExecutionMemoryWrite[];
  decisionWrites: ExecutionDecisionWrite[];
  queueWaitMs: number | null;
  schedulerDelayMs: number | null;
  provider: string;
  model: string;
  latencyMs: number | null;
  fallback: boolean;
}

export type ExecutionSessionStatus =
  | "ACTIVE"
  | "COMPLETED"
  | "FAILED"
  | "RETRY"
  | "DEAD_LETTER";

export interface ExecutionSessionEvent {
  type: string;
  timestamp: string;
  detail?: string;
}

export interface ExecutionResult {
  session: ExecutionSession;
  task: QueueTask | null;
  worker: WorkerInstance | null;
  workerResult: WorkerTaskResult | null;
  success: boolean;
  skipped: boolean;
  skipReason?: string;
}

export interface ExecutionEngineOptions {
  triggeredBy?: string;
  maxSessionsPerRun?: number;
}

export interface ExecutionEngineContext {
  eventBus: RuntimeEventBus;
  scheduler: ConnectedRuntimeScheduler;
  queue: RuntimeTaskQueue;
  registry: WorkerRegistry;
  stateMachine: VentureStateMachine;
  store: ExecutionStore;
  history: ExecutionHistoryStore;
  telemetry: ExecutionTelemetryStore;
  aiOrchestration: AiOrchestrationAdapter;
  triggeredBy: string;
}

export interface ExecutionEngine {
  runOnce(ventureId: string): ExecutionResult | null;
  runBatch(ventureId: string, maxTasks?: number): ExecutionResult[];
  getActiveSessions(): ExecutionSession[];
  getSession(sessionId: string): ExecutionSession | null;
  getSessions(ventureId?: string): ExecutionSession[];
  clear(): void;
}

export interface WorkerDispatchResult {
  worker: WorkerInstance | null;
  reason: string;
  unavailable: boolean;
}

export interface TaskDispatchResult {
  task: QueueTask | null;
  reason: string;
}

export interface StateValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface FutureAdapterStub {
  id: string;
  label: string;
  status: "coming_soon";
  description: string;
}
