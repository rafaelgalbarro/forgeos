/** ForgeOS Runtime Event Bus — type contracts (Epic 4.0). */

export type RuntimeEventCategory =
  | "venture"
  | "ceo"
  | "board"
  | "build"
  | "memory"
  | "capital"
  | "worker"
  | "task"
  | "execution";

export type RuntimeEventType =
  | "VENTURE_CREATED"
  | "DISCOVERY_COMPLETED"
  | "RESEARCH_COMPLETED"
  | "CEO_DECISION_CREATED"
  | "BOARD_CONSENSUS_REACHED"
  | "VENTURE_APPROVED"
  | "BUILD_REQUESTED"
  | "BUILD_COMPLETED"
  | "MEMORY_UPDATED"
  | "RISK_DETECTED"
  | "OPPORTUNITY_DETECTED"
  | "VENTURE_STATE_CHANGED"
  | "VENTURE_BLOCKED"
  | "VENTURE_PAUSED"
  | "VENTURE_READY_FOR_BUILD"
  | "VENTURE_READY_FOR_LAUNCH"
  | "VENTURE_READY_FOR_CAPITAL"
  | "WORKER_REGISTERED"
  | "WORKER_STARTED"
  | "WORKER_COMPLETED"
  | "WORKER_FAILED"
  | "WORKER_BLOCKED"
  | "WORKER_PAUSED"
  | "WORKER_RESUMED"
  | "WORKER_HEALTH_CHANGED"
  | "TASK_CREATED"
  | "TASK_READY"
  | "TASK_STARTED"
  | "TASK_COMPLETED"
  | "TASK_FAILED"
  | "TASK_RETRY"
  | "TASK_CANCELLED"
  | "TASK_DEAD_LETTER"
  | "TASK_TIMEOUT"
  | "EXECUTION_STARTED"
  | "EXECUTION_FINISHED"
  | "EXECUTION_FAILED"
  | "WORKER_DISPATCHED"
  | "TASK_EXECUTED"
  | "SESSION_CREATED"
  | "SESSION_FINISHED";

export interface VentureCreatedPayload {
  ventureId: string;
  name: string;
  idea?: string;
}

export interface StageCompletedPayload {
  ventureId: string;
  stage: string;
  summary?: string;
}

export interface CeoDecisionCreatedPayload {
  ventureId: string;
  decisionId: string;
  title: string;
  recommendation: string;
  confidence?: number;
}

export interface BoardConsensusReachedPayload {
  ventureId: string;
  consensusId: string;
  level: string;
  finalDecision: string;
  confidence: number;
}

export interface VentureApprovedPayload {
  ventureId: string;
  approvedBy: string;
  rationale?: string;
}

export interface BuildRequestedPayload {
  ventureId: string;
  buildPlanId?: string;
  requestedBy: string;
}

export interface BuildCompletedPayload {
  ventureId: string;
  buildId: string;
  status: "success" | "partial" | "failed";
  summary?: string;
}

export interface MemoryUpdatedPayload {
  ventureId?: string;
  memoryId: string;
  memoryType: string;
  action: "created" | "updated" | "archived";
}

export interface RiskDetectedPayload {
  ventureId: string;
  riskId: string;
  severity: "low" | "medium" | "high" | "critical";
  title: string;
  description?: string;
}

export interface OpportunityDetectedPayload {
  ventureId: string;
  opportunityId: string;
  impact: "low" | "medium" | "high";
  title: string;
  description?: string;
}

export type VentureStateEventState =
  | "IDEA"
  | "DISCOVERY"
  | "RESEARCH"
  | "PRODUCT"
  | "ARCHITECTURE"
  | "UX"
  | "BUILD"
  | "QA"
  | "LAUNCH"
  | "GROWTH"
  | "SCALE"
  | "CAPITAL"
  | "EXIT"
  | "PAUSED"
  | "BLOCKED"
  | "ARCHIVED";

export interface VentureStateChangedPayload {
  ventureId: string;
  from: VentureStateEventState;
  to: VentureStateEventState;
  reason: string;
  triggeredBy: string;
  summary?: string;
}

export interface VentureLifecycleSignalPayload {
  ventureId: string;
  state: VentureStateEventState;
  reason: string;
  triggeredBy: string;
}

export interface WorkerRegisteredPayload {
  workerId: string;
  name: string;
  department: string;
  version: string;
  ventureId?: string;
}

export interface WorkerExecutionPayload {
  workerId: string;
  ventureId: string;
  taskType: string;
  taskId: string;
}

export interface WorkerCompletedPayload extends WorkerExecutionPayload {
  durationMs: number;
  summary?: string;
}

export interface WorkerFailedPayload extends WorkerExecutionPayload {
  durationMs: number;
  error: string;
}

export interface WorkerStatusChangePayload {
  workerId: string;
  ventureId?: string;
  from: string;
  to: string;
  reason: string;
  taskType?: string;
}

export interface WorkerHealthChangedPayload {
  workerId: string;
  from: string;
  to: string;
  reason: string;
}

export interface TaskQueueEventPayload {
  taskId: string;
  ventureId: string;
  taskType: string;
  priority: string;
  status: string;
  recommendedWorkerId?: string | null;
  attemptCount?: number;
  error?: string;
  workerId?: string;
}

export interface ExecutionSessionEventPayload {
  sessionId: string;
  ventureId: string;
  workerId: string;
  taskId: string;
  status: string;
  durationMs?: number;
  error?: string;
}

export interface ExecutionLifecyclePayload {
  sessionId: string;
  ventureId: string;
  taskId: string;
  workerId: string;
  pipelineState: string;
  durationMs?: number;
  error?: string;
}

export interface WorkerDispatchedPayload {
  workerId: string;
  ventureId: string;
  taskId: string;
  taskType: string;
  sessionId: string;
  reason: string;
}

export interface TaskExecutedPayload {
  taskId: string;
  ventureId: string;
  taskType: string;
  workerId: string;
  sessionId: string;
  success: boolean;
  durationMs: number;
  error?: string;
}

/** Maps each event type to its payload shape for generic inference. */
export interface RuntimeEventPayloadMap {
  VENTURE_CREATED: VentureCreatedPayload;
  DISCOVERY_COMPLETED: StageCompletedPayload;
  RESEARCH_COMPLETED: StageCompletedPayload;
  CEO_DECISION_CREATED: CeoDecisionCreatedPayload;
  BOARD_CONSENSUS_REACHED: BoardConsensusReachedPayload;
  VENTURE_APPROVED: VentureApprovedPayload;
  BUILD_REQUESTED: BuildRequestedPayload;
  BUILD_COMPLETED: BuildCompletedPayload;
  MEMORY_UPDATED: MemoryUpdatedPayload;
  RISK_DETECTED: RiskDetectedPayload;
  OPPORTUNITY_DETECTED: OpportunityDetectedPayload;
  VENTURE_STATE_CHANGED: VentureStateChangedPayload;
  VENTURE_BLOCKED: VentureLifecycleSignalPayload;
  VENTURE_PAUSED: VentureLifecycleSignalPayload;
  VENTURE_READY_FOR_BUILD: VentureLifecycleSignalPayload;
  VENTURE_READY_FOR_LAUNCH: VentureLifecycleSignalPayload;
  VENTURE_READY_FOR_CAPITAL: VentureLifecycleSignalPayload;
  WORKER_REGISTERED: WorkerRegisteredPayload;
  WORKER_STARTED: WorkerExecutionPayload;
  WORKER_COMPLETED: WorkerCompletedPayload;
  WORKER_FAILED: WorkerFailedPayload;
  WORKER_BLOCKED: WorkerStatusChangePayload;
  WORKER_PAUSED: WorkerStatusChangePayload;
  WORKER_RESUMED: WorkerStatusChangePayload;
  WORKER_HEALTH_CHANGED: WorkerHealthChangedPayload;
  TASK_CREATED: TaskQueueEventPayload;
  TASK_READY: TaskQueueEventPayload;
  TASK_STARTED: TaskQueueEventPayload;
  TASK_COMPLETED: TaskQueueEventPayload;
  TASK_FAILED: TaskQueueEventPayload;
  TASK_RETRY: TaskQueueEventPayload;
  TASK_CANCELLED: TaskQueueEventPayload;
  TASK_DEAD_LETTER: TaskQueueEventPayload;
  TASK_TIMEOUT: TaskQueueEventPayload;
  EXECUTION_STARTED: ExecutionLifecyclePayload;
  EXECUTION_FINISHED: ExecutionLifecyclePayload;
  EXECUTION_FAILED: ExecutionLifecyclePayload;
  WORKER_DISPATCHED: WorkerDispatchedPayload;
  TASK_EXECUTED: TaskExecutedPayload;
  SESSION_CREATED: ExecutionSessionEventPayload;
  SESSION_FINISHED: ExecutionSessionEventPayload;
}

export interface RuntimeEventDefinition {
  type: RuntimeEventType;
  category: RuntimeEventCategory;
  label: string;
  description: string;
}

export interface RuntimeEvent<T extends RuntimeEventType = RuntimeEventType> {
  id: string;
  type: T;
  category: RuntimeEventCategory;
  timestamp: string;
  source: string;
  payload: RuntimeEventPayloadMap[T];
}

export type RuntimeEventHandler<T extends RuntimeEventType = RuntimeEventType> = (
  event: RuntimeEvent<T>,
) => void;

export type Unsubscribe = () => void;

export interface PublishInput<T extends RuntimeEventType> {
  type: T;
  source: string;
  payload: RuntimeEventPayloadMap[T];
  timestamp?: string;
}

export interface RuntimeEventBusOptions {
  maxHistory?: number;
}

export interface RuntimeEventBus {
  publish<T extends RuntimeEventType>(input: PublishInput<T>): RuntimeEvent<T>;
  subscribe<T extends RuntimeEventType>(
    type: T,
    handler: RuntimeEventHandler<T>,
  ): Unsubscribe;
  subscribeAll(handler: RuntimeEventHandler): Unsubscribe;
  unsubscribe(type: RuntimeEventType, handler: RuntimeEventHandler): boolean;
  getHistory(limit?: number): RuntimeEvent[];
  getHistoryByType<T extends RuntimeEventType>(
    type: T,
    limit?: number,
  ): RuntimeEvent<T>[];
  getHistoryByCategory(
    category: RuntimeEventCategory,
    limit?: number,
  ): RuntimeEvent[];
  clear(): void;
}
