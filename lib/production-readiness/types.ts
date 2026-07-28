/** Program 6500 — Production Readiness types */

export const PRODUCTION_READINESS_VERSION = "Program 6500 — Production Readiness";

export type HealthStatus = "healthy" | "degraded" | "critical" | "unknown" | "offline";
export type AlertSeverity = "info" | "warning" | "error" | "critical";
export type IncidentStatus = "open" | "investigating" | "mitigated" | "resolved" | "closed";
export type DeploymentGateStatus = "pass" | "fail" | "warn" | "pending" | "skip";
export type ChecklistItemStatus = "pass" | "fail" | "warn" | "pending" | "skip";

export interface ProductionConfigSummary {
  monitoringEnabled: boolean;
  killSwitchEnabled: boolean;
  healthEndpoint?: string;
  dryRun: boolean;
  environment: string;
}

export interface SystemHealthSnapshot {
  status: HealthStatus;
  uptimeMs: number;
  nodeVersion: string;
  platform: string;
  memoryUsageMb: number;
  timestamp: string;
  checks: SystemCheck[];
}

export interface SystemCheck {
  id: string;
  label: string;
  status: HealthStatus;
  message?: string;
}

export interface RuntimeMonitoringSnapshot {
  status: HealthStatus;
  score: number;
  executionEngineAvailable: boolean;
  dependencyNote?: string;
  portfolioHealthy: number;
  portfolioTotal: number;
  timestamp: string;
}

export interface AiMonitoringSnapshot {
  status: HealthStatus;
  realAiActive: boolean;
  providersHealthy: number;
  providersTotal: number;
  monthlyBudgetUsd: number;
  telemetryRequests: number;
  timestamp: string;
}

export interface ProductionAlert {
  id: string;
  title: string;
  message: string;
  severity: AlertSeverity;
  source: string;
  createdAt: string;
  acknowledged: boolean;
  acknowledgedAt?: string;
}

export interface ProductionIncident {
  id: string;
  title: string;
  description: string;
  status: IncidentStatus;
  severity: AlertSeverity;
  createdAt: string;
  updatedAt: string;
  assignee?: string;
  tags: string[];
}

export interface RecoveryProcedure {
  id: string;
  title: string;
  description: string;
  steps: string[];
  automated: boolean;
  lastRunAt?: string;
  status: "ready" | "running" | "completed" | "failed";
}

export interface BackupStatus {
  id: string;
  label: string;
  lastBackupAt?: string;
  status: HealthStatus;
  sizeMb?: number;
  retentionDays: number;
}

export interface DisasterRecoveryPlan {
  id: string;
  name: string;
  rtoMinutes: number;
  rpoMinutes: number;
  status: "draft" | "active" | "tested";
  lastTestAt?: string;
}

export interface ReleaseRecord {
  id: string;
  version: string;
  environment: string;
  deployedAt: string;
  status: "pending" | "deployed" | "rolled_back" | "failed";
  notes?: string;
}

export interface ProductionFeatureFlag {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  source: "production" | "beta" | "commercial" | "env";
  readOnly: boolean;
}

export interface KillSwitchState {
  enabled: boolean;
  envGated: boolean;
  affectedSystems: string[];
  activatedAt?: string;
  reason?: string;
}

export interface HealthCheckResult {
  id: string;
  label: string;
  category: string;
  status: HealthStatus;
  message?: string;
  durationMs?: number;
}

export interface PerformanceMetrics {
  requestsPerMinute: number;
  avgLatencyMs: number;
  errorRate: number;
  p95LatencyMs: number;
  timestamp: string;
  stub: boolean;
}

export interface ErrorLogEntry {
  id: string;
  message: string;
  source: string;
  severity: AlertSeverity;
  timestamp: string;
  count: number;
}

export interface RateLimitPolicy {
  id: string;
  endpoint: string;
  limit: number;
  windowSeconds: number;
  enabled: boolean;
}

export interface ApiProtectionPolicy {
  id: string;
  name: string;
  enabled: boolean;
  rules: string[];
}

export interface SecretValidationResult {
  key: string;
  present: boolean;
  required: boolean;
  category: string;
}

export interface EnvironmentValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  checkedAt: string;
}

export interface ConfigValidationResult {
  valid: boolean;
  schema: string;
  issues: Array<{ path: string; message: string; severity: "error" | "warning" }>;
}

export interface MigrationStatus {
  id: string;
  name: string;
  version: string;
  status: "pending" | "applied" | "failed" | "rolled_back";
  appliedAt?: string;
}

export interface RollbackPlan {
  id: string;
  releaseId: string;
  steps: string[];
  estimatedMinutes: number;
  ready: boolean;
}

export interface ChecklistItem {
  id: string;
  label: string;
  category: string;
  status: ChecklistItemStatus;
  detail?: string;
}

export interface DeploymentGate {
  id: string;
  label: string;
  status: DeploymentGateStatus;
  message?: string;
  blocking: boolean;
}

export interface ProductionHealthCenterSnapshot {
  version: string;
  generatedAt: string;
  overallStatus: HealthStatus;
  config: ProductionConfigSummary;
  system: SystemHealthSnapshot;
  runtime: RuntimeMonitoringSnapshot;
  ai: AiMonitoringSnapshot;
  alerts: ProductionAlert[];
  incidents: ProductionIncident[];
  healthChecks: HealthCheckResult[];
  checklist: ChecklistItem[];
  deploymentGates: DeploymentGate[];
  killSwitch: KillSwitchState;
  featureFlags: ProductionFeatureFlag[];
  releases: ReleaseRecord[];
  performance: PerformanceMetrics;
  errors: ErrorLogEntry[];
  recovery: RecoveryProcedure[];
  backups: BackupStatus[];
  disasterRecovery: DisasterRecoveryPlan[];
}
