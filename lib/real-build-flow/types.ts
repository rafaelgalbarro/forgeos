/** ForgeOS Real Build Flow — types (RC5.2). */

import type { BuildContext } from "@/lib/build-platform/build-context";
import type { BuildDna } from "@/lib/build-platform/build-dna";
import type { ReleasePackage } from "@/lib/build-platform/release-manager/types";
import type { ConnectionPlan, ConnectionResult } from "@/lib/connections/shared/types";
import type { RiskLevel } from "@/lib/skills-governance/types";
import type { ApprovalSession } from "@/lib/real-execution/types";
import type { VentureProject } from "@/lib/domain/venture";

export type BuildFlowEnvironment = "preview" | "sandbox" | "dry_run";

export type BuildFlowStepId =
  | "select_venture"
  | "read_build_context"
  | "read_build_dna"
  | "read_release_package"
  | "generate_execution_plan"
  | "dry_run"
  | "risk_check"
  | "human_approval"
  | "github_repo"
  | "github_branch"
  | "project_scaffold"
  | "supabase_sandbox"
  | "vercel_preview"
  | "audit_log"
  | "rollback_plan"
  | "final_result";

export interface BuildFlowStepResult {
  stepId: BuildFlowStepId;
  label: string;
  status: "pending" | "running" | "completed" | "skipped" | "blocked" | "failed";
  mode: BuildFlowEnvironment;
  output: string;
  provider?: "github" | "supabase" | "vercel";
  executed: boolean;
  latencyMs: number;
  connectionResult?: ConnectionResult;
}

export interface BuildFlowExecutionPlan {
  planId: string;
  ventureId: string;
  ventureName: string;
  environment: BuildFlowEnvironment;
  steps: BuildFlowPlanStep[];
  estimatedDurationMs: number;
  rollbackSteps: string[];
  recoverySteps: string[];
  requiresApproval: boolean;
}

export interface BuildFlowPlanStep {
  order: number;
  stepId: BuildFlowStepId;
  label: string;
  provider?: "github" | "supabase" | "vercel";
  capabilityId?: string;
  operation?: string;
  dependencies: BuildFlowStepId[];
}

export interface BuildFlowInput {
  ventureId: string;
  venture?: VentureProject;
  requestedBy: string;
  environment?: BuildFlowEnvironment;
  approvalSessionId?: string;
  userConfirmed?: boolean;
}

export interface BuildFlowDryRunResult {
  flowId: string;
  venture: VentureProject;
  buildContext: BuildContext;
  buildDna: BuildDna;
  releasePackage: ReleasePackage;
  executionPlan: BuildFlowExecutionPlan;
  riskLevel: RiskLevel;
  riskFactors: string[];
  steps: BuildFlowStepResult[];
  approvalRequired: boolean;
  realExecutionEnabled: boolean;
  blockedReason?: string;
}

export interface BuildFlowExecuteResult extends BuildFlowDryRunResult {
  approvalSession?: ApprovalSession;
  auditId: string;
  rollbackPlan: ConnectionPlan;
  success: boolean;
  previewUrl?: string;
  repoUrl?: string;
}

export interface BuildFlowAuditEntry {
  id: string;
  timestamp: string;
  flowId: string;
  ventureId: string;
  requestedBy: string;
  environment: BuildFlowEnvironment;
  outcome: "dry_run" | "approval_requested" | "approved" | "executed" | "blocked" | "failed";
  riskLevel: RiskLevel;
  stepsCompleted: number;
  details: string;
}

export interface BuildFlowPolicySummary {
  enableRealBuildFlow: boolean;
  requireApproval: boolean;
  defaultEnvironment: BuildFlowEnvironment;
  allowedProviders: string[];
  blockedOperations: string[];
}
