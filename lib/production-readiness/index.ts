/** Program 6500 — Production Readiness public API */

export { PRODUCTION_READINESS_VERSION } from "./types";
export type * from "./types";

export {
  isProductionMonitoringEnabled,
  isKillSwitchEnabled,
  getProductionHealthEndpoint,
  isProductionDryRun,
  getProductionEnvironment,
  isStructuredLoggingEnabled,
  isTracingEnabled,
  isMetricsCollectionEnabled,
  getRateLimitDefault,
  PRODUCTION_STORAGE_KEYS,
  REQUIRED_SECRETS,
} from "./config";

export {
  buildProductionHealthCenterSnapshot,
  runProductionReadinessEngine,
} from "./production-health-center";

export { buildSystemHealthSnapshot, probeExternalHealthEndpoint } from "./system-monitoring";
export { buildRuntimeMonitoringSnapshot } from "./runtime-monitoring";
export { buildAiMonitoringSnapshot } from "./ai-monitoring";
export {
  checkProviderHealth,
  checkPrimaryProvidersHealth,
  checkAllConfiguredProvidersHealth,
  SPRINT4_PRIMARY_PROVIDERS,
} from "./provider-monitoring";
export type { ProviderHealthSnapshot } from "./provider-monitoring";

export {
  listAlerts,
  getActiveAlerts,
  pushAlert,
  acknowledgeAlert,
  clearAcknowledgedAlerts,
  seedDemoAlerts,
} from "./alert-center";

export {
  listIncidents,
  getIncident,
  createIncident,
  updateIncidentStatus,
  deleteIncident,
  seedDemoIncidents,
} from "./incident-manager";

export { listRecoveryProcedures, getRecoveryProcedure, runRecoveryProcedure } from "./recovery-center";
export { getBackupStatus, triggerBackupStub } from "./backup-manager";
export { getDisasterRecoveryPlan, listDisasterRecoveryPlans, runDrTestStub } from "./disaster-recovery";
export { listReleases, registerRelease, getLatestRelease } from "./release-manager";
export { listProductionFeatureFlags, isProductionFeatureEnabled } from "./feature-flags";
export { getKillSwitchState, wouldBlockSystem } from "./kill-switch";
export { runAggregatedHealthChecks, computeOverallHealthFromChecks } from "./health-checks";
export { collectPerformanceMetrics } from "./performance-dashboard";
export { listErrorLogs, recordError, clearErrorLogs, seedDemoErrors } from "./error-tracking";
export { formatStructuredLog, serializeLog } from "./structured-logging";
export type { StructuredLogEntry } from "./structured-logging";
export { createTraceContext, childSpan, traceHeaders } from "./tracing";
export type { TraceContext } from "./tracing";
export { incrementCounter, getCounter, collectMetrics } from "./metrics";
export type { MetricPoint } from "./metrics";
export { getRateLimitPolicies, getRateLimitForEndpoint } from "./rate-limits";
export { getApiProtectionPolicies } from "./api-protection";
export { validateSecrets, secretsSummary } from "./secrets-validation";
export { validateEnvironment } from "./environment-validation";
export { validateConfiguration } from "./configuration-validator";
export { listMigrations, getPendingMigrations } from "./migration-manager";
export { getRollbackPlan, listRollbackPlans } from "./rollback-manager";
export { buildProductionChecklist, checklistScore } from "./production-checklist";
export { evaluateDeploymentGates, canDeploy } from "./deployment-gates";
