/** ForgeOS Runtime Observability — shared type contracts (Epic 4.6). */

import type { RuntimeEvent } from "../event-bus/types";
import type { RuntimeEventBus } from "../event-bus/types";
import type { SchedulerSnapshot, RuntimeScheduler } from "../scheduler/types";
import type { QueueSnapshot, RuntimeTaskQueue } from "../task-queue/types";
import type { WorkerInstance, WorkerRegistry } from "../workers/types";
import type { WorkerRuntimeMetrics } from "../workers/metrics";

export type RuntimeHealthLevel =
  | "HEALTHY"
  | "WARNING"
  | "DEGRADED"
  | "CRITICAL"
  | "OFFLINE";

export const HEALTH_LEVEL_LABELS: Record<RuntimeHealthLevel, string> = {
  HEALTHY: "Healthy",
  WARNING: "Warning",
  DEGRADED: "Degraded",
  CRITICAL: "Critical",
  OFFLINE: "Offline",
};

export type RuntimeComponentId =
  | "event-bus"
  | "scheduler"
  | "task-queue"
  | "worker-runtime"
  | "execution-engine"
  | "memory"
  | "decision-graph"
  | "ai-gateway"
  | "ai-orchestration";

export const COMPONENT_LABELS: Record<RuntimeComponentId, string> = {
  "event-bus": "Event Bus",
  scheduler: "Scheduler",
  "task-queue": "Task Queue",
  "worker-runtime": "Worker Runtime",
  "execution-engine": "Execution Engine",
  memory: "Memory",
  "decision-graph": "Decision Graph",
  "ai-gateway": "AI Gateway",
  "ai-orchestration": "AI Orchestration",
};

export interface ComponentHealthReport {
  component: RuntimeComponentId;
  level: RuntimeHealthLevel;
  message: string;
  checkedAt: string;
  details?: Record<string, unknown>;
}

export type TraceStage =
  | "event"
  | "scheduler"
  | "queue"
  | "worker"
  | "execution"
  | "memory"
  | "finished";

export const TRACE_STAGE_LABELS: Record<TraceStage, string> = {
  event: "Event",
  scheduler: "Scheduler",
  queue: "Queue",
  worker: "Worker",
  execution: "Execution",
  memory: "Memory",
  finished: "Finished",
};

export interface TraceSpan {
  stage: TraceStage;
  startedAt: string;
  completedAt: string | null;
  latencyMs: number | null;
  entityId?: string;
  entityType?: string;
  errors: string[];
  warnings: string[];
}

export interface RuntimeTrace {
  id: string;
  ventureId: string;
  eventId: string | null;
  taskId: string | null;
  workerId: string | null;
  startedAt: string;
  completedAt: string | null;
  totalLatencyMs: number | null;
  status: "in_progress" | "completed" | "failed" | "partial";
  spans: TraceSpan[];
  errors: string[];
  warnings: string[];
}

export interface RuntimeMetricsSnapshot {
  uptimeMs: number;
  avgLatencyMs: number;
  taskThroughput: number;
  activeWorkers: number;
  blockedWorkers: number;
  errorCount: number;
  retryCount: number;
  deadLetterCount: number;
  avgWorkerExecutionMs: number;
  aiCallCount: number;
  estimatedAiCost: number;
  eventCount: number;
  queueDepth: number;
  schedulerTaskCount: number;
  collectedAt: string;
}

export type AlertLevel = "INFO" | "WARNING" | "ERROR" | "CRITICAL";

export type AlertType =
  | "WORKER_OFFLINE"
  | "QUEUE_SATURATED"
  | "SCHEDULER_STOPPED"
  | "EXECUTION_BLOCKED"
  | "AI_PROVIDER_SLOW"
  | "MEMORY_INCONSISTENT";

export const ALERT_TYPE_LABELS: Record<AlertType, string> = {
  WORKER_OFFLINE: "Worker Offline",
  QUEUE_SATURATED: "Queue Saturated",
  SCHEDULER_STOPPED: "Scheduler Stopped",
  EXECUTION_BLOCKED: "Execution Blocked",
  AI_PROVIDER_SLOW: "AI Provider Slow",
  MEMORY_INCONSISTENT: "Memory Inconsistent",
};

export interface RuntimeAlert {
  id: string;
  type: AlertType;
  level: AlertLevel;
  message: string;
  component: RuntimeComponentId;
  ventureId?: string;
  timestamp: string;
  acknowledged: boolean;
  metadata?: Record<string, unknown>;
}

export type RuntimeErrorSeverity = "low" | "medium" | "high" | "critical";

export interface RuntimeErrorRecord {
  id: string;
  component: RuntimeComponentId;
  message: string;
  severity: RuntimeErrorSeverity;
  timestamp: string;
  ventureId?: string;
  taskId?: string;
  workerId?: string;
  stack?: string;
  context?: Record<string, unknown>;
}

export type RecoveryActionType =
  | "RESTART_WORKER"
  | "RETRY_TASK"
  | "CLEAR_BLOCKED_QUEUE"
  | "CLEAN_ORPHAN_SESSION"
  | "RE_EMIT_EVENT";

export const RECOVERY_ACTION_LABELS: Record<RecoveryActionType, string> = {
  RESTART_WORKER: "Restart Worker",
  RETRY_TASK: "Retry Task",
  CLEAR_BLOCKED_QUEUE: "Clear Blocked Queue",
  CLEAN_ORPHAN_SESSION: "Clean Orphan Session",
  RE_EMIT_EVENT: "Re-emit Event",
};

export interface RecoveryAction {
  type: RecoveryActionType;
  target: string;
  reason: string;
  priority: "low" | "medium" | "high";
  autoExecutable: false;
}

export interface RecoveryPlan {
  id: string;
  generatedAt: string;
  ventureId?: string;
  triggerAlertIds: string[];
  actions: RecoveryAction[];
  summary: string;
}

export type DiagnosticSeverity = "info" | "warning" | "error";

export type DiagnosticCategory =
  | "circular-import"
  | "unregistered-worker"
  | "inconsistent-queue"
  | "broken-dependency"
  | "missing-adapter"
  | "high-latency"
  | "unresponsive-provider";

export interface DiagnosticFinding {
  id: string;
  category: DiagnosticCategory;
  severity: DiagnosticSeverity;
  component: RuntimeComponentId;
  message: string;
  suggestion: string;
  detectedAt: string;
}

export interface ProfilerSample {
  id: string;
  label: string;
  component: RuntimeComponentId;
  durationMs: number;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface HistoryEntry {
  id: string;
  timestamp: string;
  kind: "health" | "alert" | "error" | "trace" | "recovery" | "diagnostic";
  summary: string;
  payload: Record<string, unknown>;
}

export interface RuntimeObservabilityContext {
  ventureId: string;
  eventBus: Pick<RuntimeEventBus, "getHistory" | "clear">;
  scheduler: RuntimeScheduler;
  queue: RuntimeTaskQueue;
  workers: WorkerRegistry;
  /** Optional Epic 4.5 execution engine for integrated health probes. */
  executionEngine?: {
    getActiveSessions(): import("../execution-engine/types").ExecutionSession[];
    getSessions(ventureId?: string): import("../execution-engine/types").ExecutionSession[];
  };
}

export interface RuntimeDashboardSnapshot {
  overallHealth: RuntimeHealthLevel;
  components: ComponentHealthReport[];
  metrics: RuntimeMetricsSnapshot;
  alerts: RuntimeAlert[];
  errors: RuntimeErrorRecord[];
  traces: RuntimeTrace[];
  recoveryPlan: RecoveryPlan | null;
  diagnostics: DiagnosticFinding[];
  profilerSamples: ProfilerSample[];
  history: HistoryEntry[];
  scheduler: SchedulerSnapshot;
  queue: QueueSnapshot;
  workers: WorkerInstance[];
  recentEvents: RuntimeEvent[];
  generatedAt: string;
}

export interface RuntimeMonitorOptions {
  maxTraces?: number;
  maxAlerts?: number;
  maxErrors?: number;
  maxHistory?: number;
  queueSaturationThreshold?: number;
  aiSlowLatencyMs?: number;
}
