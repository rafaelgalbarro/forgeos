/** ForgeOS Build Pipeline — Program 3000 Sprint 5 types. */

import type { ConnectionHealthStatus, ConnectionPlan } from "@/lib/connections/shared/types";
import type { ApprovalSession } from "@/lib/real-execution/types";
import type { BuildFlowDryRunResult, BuildFlowExecuteResult } from "@/lib/real-build-flow/types";
import type { RiskLevel } from "@/lib/skills-governance/types";

export type PipelineStageId =
  | "connections_health"
  | "approval_gate"
  | "dry_run"
  | "risk_assessment"
  | "github_repository"
  | "supabase_project"
  | "vercel_project"
  | "deploy_preview"
  | "migration_plan"
  | "rollback_plan"
  | "build_report"
  | "audit_trail";

export type PipelineStageStatus =
  | "pending"
  | "running"
  | "completed"
  | "blocked"
  | "skipped"
  | "failed";

export type PipelineMode = "dry_run" | "preview" | "real";

export interface PipelineStage {
  id: PipelineStageId;
  label: string;
  status: PipelineStageStatus;
  provider?: "github" | "supabase" | "vercel";
  output?: string;
  requiresApproval: boolean;
  executed: boolean;
  latencyMs: number;
}

export interface RepositoryPlan {
  planId: string;
  repoName: string;
  visibility: "private";
  branch: string;
  scaffold: boolean;
  mode: PipelineMode;
  proposedUrl: string;
  status: "proposed" | "created" | "dry_run";
}

export interface ProjectPlan {
  planId: string;
  provider: "supabase" | "vercel";
  projectName: string;
  environment: "sandbox" | "preview";
  mode: PipelineMode;
  summary: string;
}

export interface DeployPreviewPlan {
  planId: string;
  target: "preview";
  production: false;
  previewUrl: string;
  vercelProject: string;
  mode: PipelineMode;
  summary: string;
}

export interface MigrationPlanEntry {
  order: number;
  file: string;
  description: string;
  reversible: boolean;
}

export interface MigrationPlan {
  planId: string;
  provider: "supabase";
  environment: "sandbox";
  migrations: MigrationPlanEntry[];
  mode: PipelineMode;
  summary: string;
}

export interface RollbackPlanSummary {
  planId: string;
  plan: ConnectionPlan;
  ready: boolean;
  recoverySteps: string[];
  summary: string;
}

export interface BuildReportSummary {
  reportId: string;
  flowId: string;
  ventureId: string;
  ventureName: string;
  success: boolean;
  mode: PipelineMode;
  stagesCompleted: number;
  stagesTotal: number;
  previewUrl?: string;
  repoUrl?: string;
  riskLevel: RiskLevel;
  approvalRequired: boolean;
  realExecutionEnabled: boolean;
  generatedAt: string;
}

export interface PipelineRiskAssessment {
  level: RiskLevel;
  score: number;
  factors: string[];
  blocked: boolean;
  blockedReason?: string;
}

export interface PipelineAuditEntry {
  id: string;
  timestamp: string;
  pipelineId: string;
  ventureId: string;
  outcome: "dry_run" | "approval_requested" | "approved" | "executed" | "blocked" | "failed";
  stage: PipelineStageId;
  details: string;
}

export interface PipelineTimelineEvent {
  id: string;
  timestamp: string;
  stage: PipelineStageId;
  label: string;
  status: PipelineStageStatus;
  provider?: string;
  message: string;
}

export interface BuildPipelineInput {
  ventureId: string;
  requestedBy: string;
  mode?: PipelineMode;
  approvalSessionId?: string;
  userConfirmed?: boolean;
}

export interface BuildPipelineSnapshot {
  pipelineId: string;
  mode: PipelineMode;
  stages: PipelineStage[];
  connectionHealth: ConnectionHealthStatus[];
  repositoryPlan?: RepositoryPlan;
  projectPlans: ProjectPlan[];
  deployPreviewPlan?: DeployPreviewPlan;
  migrationPlan?: MigrationPlan;
  rollbackPlan?: RollbackPlanSummary;
  buildReport?: BuildReportSummary;
  risk?: PipelineRiskAssessment;
  audit: PipelineAuditEntry[];
  timeline: PipelineTimelineEvent[];
  approvalSession?: ApprovalSession;
  dryRunResult?: BuildFlowDryRunResult;
  executeResult?: BuildFlowExecuteResult;
}

export interface BuildPipelinePolicy {
  enableRealBuildFlow: boolean;
  enableRealExecution: boolean;
  requireApproval: boolean;
  defaultMode: PipelineMode;
  previewOnly: true;
  productionBlocked: true;
}
