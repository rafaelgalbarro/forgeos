/** ForgeOS Runtime Observability — public API (Epic 4.6). */

export type {
  AlertLevel,
  AlertType,
  ComponentHealthReport,
  DiagnosticCategory,
  DiagnosticFinding,
  DiagnosticSeverity,
  HistoryEntry,
  ProfilerSample,
  RecoveryAction,
  RecoveryActionType,
  RecoveryPlan,
  RuntimeAlert,
  RuntimeComponentId,
  RuntimeDashboardSnapshot,
  RuntimeErrorRecord,
  RuntimeErrorSeverity,
  RuntimeHealthLevel,
  RuntimeMetricsSnapshot,
  RuntimeMonitorOptions,
  RuntimeObservabilityContext,
  RuntimeTrace,
  TraceSpan,
  TraceStage,
} from "./types";

export {
  HEALTH_LEVEL_LABELS,
  COMPONENT_LABELS,
  TRACE_STAGE_LABELS,
  ALERT_TYPE_LABELS,
  RECOVERY_ACTION_LABELS,
} from "./types";

export { createRuntimeMonitor, type RuntimeMonitor } from "./runtime-monitor";
export { buildRuntimeDashboard } from "./runtime-dashboard";
export {
  probeAllComponentHealth,
  probeEventBusHealth,
  probeSchedulerHealth,
  probeTaskQueueHealth,
  probeWorkerRuntimeHealth,
  probeExecutionEngineHealth,
  probeMemoryHealth,
  probeDecisionGraphHealth,
  probeAiGatewayHealth,
  probeAiOrchestrationHealth,
  computeOverallHealth,
  isExecutionEngineAvailable,
  isExecutionEngineModuleAvailable,
  EXECUTION_ENGINE_DEPENDENCY_NOTE,
} from "./runtime-health";
export { collectRuntimeMetrics } from "./runtime-metrics";
export {
  detectRuntimeAlerts,
  storeAlerts,
  acknowledgeAlert,
  getActiveAlerts,
} from "./runtime-alerts";
export { recordRuntimeError, getRuntimeErrors, clearRuntimeErrors } from "./runtime-errors";
export {
  createRuntimeTrace,
  startTraceSpan,
  completeTraceSpan,
  finalizeTrace,
  storeTrace,
  buildPipelineTrace,
  getTracesForVenture,
  getExpectedStageOrder,
} from "./runtime-traces";
export { generateRecoveryPlan, storeRecoveryPlan } from "./runtime-recovery";
export { runRuntimeDiagnostics, storeDiagnostics, detectCircularImportRisks } from "./runtime-diagnostics";
export { recordProfilerSample, profileAsync, profileSync, getProfilerSummary } from "./runtime-profiler";
export { recordHealthSnapshot, getObservabilityHistory, clearObservabilityHistory } from "./runtime-history";
export { createObservabilityStore, type ObservabilityStore } from "./runtime-store";
