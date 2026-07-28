/** PROGRAM 5380 — One-Click Preview Deployment contract. */

export const PREVIEW_DEPLOYMENT_VERSION = "PROGRAM 5380 — ONE-CLICK PREVIEW DEPLOYMENT";

export type PreviewDeploymentStatus =
  | "DRAFT"
  | "VALIDATING"
  | "BLOCKED"
  | "AWAITING_APPROVAL"
  | "APPROVED"
  | "CREATING_REPOSITORY"
  | "PUSHING_CODE"
  | "CONFIGURING_ENVIRONMENT"
  | "DEPLOYING"
  | "VERIFYING"
  | "READY"
  | "READY_WITH_PLAN"
  | "FAILED"
  | "ROLLED_BACK"
  | "CANCELLED";

export type PreviewDeploymentEnvironment = "preview" | "sandbox" | "dry_run";

export type PreviewProvider = "github" | "vercel" | "supabase";

export type DeploymentPreconditionId =
  | "sandbox_build"
  | "critical_errors"
  | "qa_gate"
  | "security_scan"
  | "approval"
  | "rollback_plan"
  | "provider_health"
  | "feature_flag"
  | "no_secrets"
  | "environment_preview";

export interface DeploymentPrecondition {
  id: DeploymentPreconditionId;
  label: string;
  passed: boolean;
  blocking: boolean;
  detail?: string;
}

export interface RepositoryPlan {
  org: string;
  name: string;
  fullName: string;
  visibility: "private";
  defaultBranch: string;
  initialCommitMessage: string;
  filesIncluded: number;
  filesExcluded: string[];
  dryRun: boolean;
  created?: boolean;
  repoUrl?: string;
}

export interface CodePushResult {
  branch: string;
  commitSha: string;
  filesRegistered: number;
  checksums: Record<string, string>;
  warnings: string[];
  forcePush: false;
  dryRun: boolean;
  pushed?: boolean;
}

export interface SupabasePreviewPlan {
  projectName: string;
  environment: "preview";
  schemaTables: string[];
  migrations: string[];
  seedPlan: string;
  rlsEnabled: boolean;
  rollbackSteps: string[];
  dryRun: boolean;
  configured?: boolean;
  projectUrl?: string;
}

export interface VercelPreviewPlan {
  projectName: string;
  environment: "preview";
  deploymentId?: string;
  previewUrl?: string;
  buildCommand: string;
  envVars: { key: string; value: string; preview: true }[];
  smokeTestPlan: string[];
  dryRun: boolean;
  deployed?: boolean;
}

export interface SmokeTestResult {
  id: string;
  label: string;
  route: string;
  status: "pass" | "fail" | "skip" | "dry_run";
  durationMs: number;
  detail?: string;
}

export interface HealthCheckResult {
  passed: boolean;
  dryRun: boolean;
  previewUrl?: string;
  checks: {
    id: string;
    label: string;
    status: "pass" | "fail" | "skip" | "dry_run";
    durationMs: number;
    detail?: string;
  }[];
  sslValid?: boolean;
  responseTimeMs?: number;
  checkedAt: string;
}

export interface RollbackPlan {
  id: string;
  steps: string[];
  revertCommitSha?: string;
  deactivatePreview: boolean;
  cleanupSandbox: boolean;
  documented: boolean;
}

export interface DeploymentApproval {
  id: string;
  status: "pending" | "approved" | "rejected";
  requestedAt: string;
  resolvedAt?: string;
  approvedBy?: string;
  note?: string;
}

export interface DeploymentAuditEntry {
  id: string;
  deploymentId: string;
  timestamp: string;
  action: string;
  status: PreviewDeploymentStatus;
  detail: string;
  actor?: string;
}

export interface DeploymentHistoryEntry {
  deploymentId: string;
  missionId: string;
  projectVersion: string;
  releaseVersion: string;
  commitSha?: string;
  provider: PreviewProvider | "multi";
  previewUrl?: string;
  status: PreviewDeploymentStatus;
  deployedAt: string;
  approval?: DeploymentApproval;
  rolledBack?: boolean;
  dryRun: boolean;
}

export interface PreviewDeploymentRequest {
  deploymentId: string;
  missionId: string;
  ventureId?: string;
  projectId: string;
  projectVersion: string;
  releaseVersion: string;
  sandboxBuildId: string;
  status: PreviewDeploymentStatus;
  environment: PreviewDeploymentEnvironment;
  preconditions: DeploymentPrecondition[];
  allPreconditionsPassed: boolean;
  approval: DeploymentApproval;
  repository?: RepositoryPlan;
  codePush?: CodePushResult;
  supabase?: SupabasePreviewPlan;
  vercel?: VercelPreviewPlan;
  healthCheck?: HealthCheckResult;
  smokeTests: SmokeTestResult[];
  rollbackPlan: RollbackPlan;
  previewUrl?: string;
  dryRun: boolean;
  realExecution: boolean;
  logs: string[];
  warnings: string[];
  errors: string[];
  auditTrail: DeploymentAuditEntry[];
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface PreviewDeploymentPolicy {
  enablePreviewDeployment: boolean;
  enableGithubPush: boolean;
  enableVercelDeployment: boolean;
  enableSupabaseSetup: boolean;
  requireApproval: boolean;
  environment: PreviewDeploymentEnvironment;
  allowProduction: boolean;
}

export interface PreviewDeploymentInput {
  missionId: string;
  ventureId?: string;
  projectId: string;
  projectVersion: string;
  releaseVersion?: string;
  sandboxBuildId: string;
  requestedBy: string;
  approvalSessionId?: string;
  userConfirmed?: boolean;
}

export interface PreviewDeploymentResult {
  request: PreviewDeploymentRequest;
  success: boolean;
  blockedReason?: string;
}
