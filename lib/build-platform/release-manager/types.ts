import type { BackendBlueprint } from "@/lib/build-platform/backend-factory";
import type { BuildContext } from "@/lib/build-platform/build-context";
import type { BuildDna } from "@/lib/build-platform/build-dna";
import type { DatabaseBlueprint } from "@/lib/build-platform/database-factory";
import type { FrontendBlueprint } from "@/lib/build-platform/frontend-factory";
import type { InfraBlueprint } from "@/lib/build-platform/infrastructure-factory";
import type { QaBlueprint } from "@/lib/build-platform/qa-factory";
import type { VentureProject } from "@/lib/domain/venture";

export type ReleaseStatus =
  | "DRAFT"
  | "READY_FOR_REVIEW"
  | "APPROVED"
  | "BLOCKED"
  | "REJECTED"
  | "RELEASED"
  | "ROLLED_BACK";

export interface SemanticVersion {
  major: number;
  minor: number;
  patch: number;
  prerelease?: string;
  buildMetadata?: string;
}

export interface ReleaseArtifactRef {
  id: string;
  label: string;
  type: ReleaseArtifactType;
  status: "present" | "missing" | "draft";
  summary: string;
}

export type ReleaseArtifactType =
  | "frontend-blueprint"
  | "backend-blueprint"
  | "database-blueprint"
  | "qa-plan"
  | "infrastructure-spec"
  | "documentation"
  | "environment-checklist";

export interface ReleaseArtifacts {
  frontendBlueprint: FrontendBlueprint | null;
  backendBlueprint: BackendBlueprint | null;
  databaseBlueprint: DatabaseBlueprint | null;
  qaPlan: QaBlueprint | null;
  infrastructureSpec: InfraBlueprint | null;
  documentation: ReleaseDocumentation;
  environmentChecklist: EnvironmentChecklistItem[];
  refs: ReleaseArtifactRef[];
}

export interface ReleaseDocumentation {
  readme: string;
  architectureOverview: string;
  apiSummary: string;
  deploymentGuide: string;
}

export interface EnvironmentChecklistItem {
  id: string;
  environment: "development" | "staging" | "production";
  label: string;
  required: boolean;
  configured: boolean;
  notes?: string;
}

export type QualityGateStatus = "pass" | "fail" | "warn";

export interface QualityGateResult {
  id: string;
  label: string;
  status: QualityGateStatus;
  message: string;
  blocking: boolean;
}

export interface ApprovalStep {
  id: string;
  role: string;
  status: "pending" | "approved" | "rejected" | "skipped";
  decidedAt?: string;
  comment?: string;
}

export interface ApprovalWorkflowState {
  status: ReleaseStatus;
  steps: ApprovalStep[];
  blockers: string[];
  lastTransitionAt: string;
}

export type RollbackRiskLevel = "low" | "medium" | "high" | "critical";

export interface RollbackStep {
  order: number;
  action: string;
  owner: string;
  estimatedMinutes: number;
}

export interface RollbackPlan {
  strategy: string;
  affectedSystems: string[];
  backups: string[];
  steps: RollbackStep[];
  riskLevel: RollbackRiskLevel;
  owner: string;
}

export interface ReleaseNotes {
  summary: string;
  changes: string[];
  risks: string[];
  knownIssues: string[];
  nextSteps: string[];
}

export interface DeploymentChecklistItem {
  id: string;
  category: "preflight" | "deploy" | "post-deploy" | "rollback";
  label: string;
  completed: boolean;
  owner: string;
}

export interface ReleaseTimelineEvent {
  id: string;
  timestamp: string;
  phase: "build" | "validate" | "review" | "approve" | "release" | "rollback";
  label: string;
  detail: string;
}

export interface ReleasePackage {
  releaseId: string;
  ventureId: string;
  version: SemanticVersion;
  status: ReleaseStatus;
  createdAt: string;
  artifacts: ReleaseArtifacts;
  qualityGates: QualityGateResult[];
  approvals: ApprovalWorkflowState;
  rollbackPlan: RollbackPlan;
  releaseNotes: ReleaseNotes;
  deploymentChecklist: DeploymentChecklistItem[];
  timeline: ReleaseTimelineEvent[];
}

export interface ReleaseValidationIssue {
  code: string;
  message: string;
  severity: "error" | "warning" | "info";
  field?: string;
}

export interface ReleaseValidationResult {
  valid: boolean;
  score: number;
  issues: ReleaseValidationIssue[];
}

export interface BuildReleasePackageInput {
  venture: VentureProject;
}

export interface ReleaseBuildContext {
  venture: VentureProject;
  context: BuildContext;
  dna: BuildDna;
}
