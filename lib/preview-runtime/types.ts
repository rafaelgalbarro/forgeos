/** PROGRAM 5370 — Sandboxed Preview Runtime contract. */

export const PREVIEW_RUNTIME_VERSION = "PROGRAM 5370 — SANDBOXED PREVIEW RUNTIME";

export type PreviewSandboxStatus =
  | "PENDING"
  | "PREPARING"
  | "INSTALLING"
  | "BUILDING"
  | "STARTING"
  | "READY"
  | "DEGRADED"
  | "FAILED"
  | "STOPPING"
  | "STOPPED"
  | "EXPIRED";

export type BuildResultStatus = "BUILD_PASSED" | "BUILD_FAILED" | "BUILD_TIMEOUT" | "BUILD_SKIPPED";

export type IsolationStrategy = "docker" | "child-process" | "unavailable";

export type PreviewErrorCategory =
  | "dependency"
  | "typescript"
  | "syntax"
  | "import"
  | "build"
  | "route"
  | "runtime"
  | "hydration"
  | "network"
  | "environment"
  | "timeout"
  | "security";

export interface PreviewLogEntry {
  id: string;
  timestamp: string;
  stream: "stdout" | "stderr" | "system";
  level: "info" | "warn" | "error" | "debug";
  message: string;
  phase?: string;
}

export interface PreviewResourceUsage {
  cpuPercent?: number;
  memoryMb?: number;
  diskMb?: number;
  processCount?: number;
  elapsedMs: number;
}

export interface PreviewBuildResult {
  status: BuildResultStatus;
  exitCode?: number;
  durationMs: number;
  stdout: string;
  stderr: string;
  errors: PreviewParsedError[];
  warnings: string[];
  routes?: string[];
  bundleSizeKb?: number;
}

export interface PreviewParsedError {
  category: PreviewErrorCategory;
  message: string;
  file?: string;
  line?: number;
  column?: number;
  raw?: string;
}

export interface PreviewHealthCheck {
  ok: boolean;
  url?: string;
  statusCode?: number;
  latencyMs?: number;
  lastCheckedAt: string;
  message?: string;
}

export interface RepairPlanItem {
  id: string;
  cause: string;
  affectedFiles: string[];
  suggestedChange: string;
  risk: "low" | "medium" | "high";
  approvalRequired: boolean;
}

export interface RepairPlan {
  id: string;
  sandboxId: string;
  missionId: string;
  outputId?: string;
  createdAt: string;
  items: RepairPlanItem[];
  autoApply: false;
  changeRequestId?: string;
}

export interface PreviewSandbox {
  id: string;
  missionId: string;
  outputId?: string;
  projectId: string;
  projectKind: string;
  status: PreviewSandboxStatus;
  isolation: IsolationStrategy;
  workspaceDir: string;
  port?: number;
  previewUrl?: string;
  pid?: number;
  dockerContainerId?: string;
  build?: PreviewBuildResult;
  health?: PreviewHealthCheck;
  resources: PreviewResourceUsage;
  logs: PreviewLogEntry[];
  repairPlan?: RepairPlan;
  mobilePreviewPlan?: string;
  expoQrSafe?: boolean;
  env: Record<string, string>;
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
  error?: string;
  limitsExceeded?: boolean;
}

export interface StartSandboxRequest {
  missionId: string;
  outputId?: string;
  factoryProjectId?: string;
  projectKind?: string;
}

export interface SandboxListFilter {
  missionId?: string;
  status?: PreviewSandboxStatus;
}

export interface PaginatedLogs {
  entries: PreviewLogEntry[];
  total: number;
  offset: number;
  limit: number;
  hasMore: boolean;
}

export interface DockerAvailability {
  available: boolean;
  version?: string;
  strategy: IsolationStrategy;
  message: string;
}

export interface E2EVerificationResult {
  missionId: string;
  strategy: IsolationStrategy;
  dockerAvailable: boolean;
  projects: {
    kind: string;
    projectId: string;
    buildStatus: BuildResultStatus;
    previewReady: boolean;
    durationMs: number;
    errors: PreviewParsedError[];
    warnings: string[];
    repairPlanGenerated: boolean;
  }[];
  forgeOsStable: boolean;
  cleanupOk: boolean;
  orphanPorts: number[];
  startedAt: string;
  completedAt: string;
}

/** PROGRAM 5370/5380 — Sandbox build record for preview deployment adapter. */
export type SandboxBuildStatus =
  | "BUILDING"
  | "BUILD_PASSED"
  | "BUILD_FAILED"
  | "BUILD_TIMEOUT"
  | "QA_BLOCKED"
  | "READY_FOR_DEPLOY";

export interface SandboxQAGate {
  id: string;
  label: string;
  status: "pass" | "fail" | "warn" | "pending" | "blocked" | "skip";
  blocking: boolean;
  detail?: string;
}

export interface SandboxPreviewBuild {
  buildId: string;
  missionId: string;
  projectId: string;
  projectVersion: string;
  status: SandboxBuildStatus;
  environment: "preview" | "sandbox" | "dry_run";
  buildStartedAt: string;
  buildCompletedAt?: string;
  buildDurationMs?: number;
  buildLog: string[];
  qaGates: SandboxQAGate[];
  securityScan: {
    passed: boolean;
    blocked: boolean;
    findings: { id: string; severity: "low" | "medium" | "high" | "critical"; message: string }[];
    scannedAt: string;
  };
  criticalErrors: string[];
  dryRun: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SandboxBuildInput {
  missionId: string;
  projectId: string;
  projectVersion: string;
  dryRun?: boolean;
}
