/** ForgeOS Skills Governance — core types (RC4.1). */

import type { MeshDepartmentId } from "@/lib/executive-mesh/types";
import type { SkillRequest, SkillResult } from "@/lib/skills/types";

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type ApprovalType =
  | "auto"
  | "founder"
  | "ceo"
  | "board"
  | "dual"
  | "emergency";

export type SandboxMode = "simulation" | "dry_run" | "sandbox" | "production";

export type PermissionEffect = "allow" | "deny" | "restrict" | "expire" | "delegate";

export type PolicyKind =
  | "cost"
  | "security"
  | "privacy"
  | "execution"
  | "compliance"
  | "ai_usage"
  | "tool"
  | "organization";

export type GovernanceActorType = "founder" | "ceo" | "department" | "worker" | "organization";

export interface GovernancePermission {
  id: string;
  actorType: GovernanceActorType;
  actorId: string;
  skillId?: string;
  provider?: string;
  workspaceId?: string;
  effect: PermissionEffect;
  scopes: string[];
  expiresAt?: string;
  delegatedFrom?: string;
}

export interface RiskAssessment {
  level: RiskLevel;
  score: number;
  factors: string[];
  requiresApproval: ApprovalType;
  sandboxMode: SandboxMode;
}

export interface ApprovalDecision {
  type: ApprovalType;
  approved: boolean;
  approvers: string[];
  signature: string;
  approvalTimeMs: number;
  rationale: string;
}

export interface PolicyEvaluation {
  policy: PolicyKind;
  passed: boolean;
  violations: string[];
  constraints: string[];
}

export interface PolicyEvaluationResult {
  passed: boolean;
  evaluations: PolicyEvaluation[];
  blockedBy?: PolicyKind;
}

export interface RollbackPlan {
  skillId: string;
  steps: string[];
  recoveryPlan: string[];
  compensationActions: string[];
}

export interface GovernanceAuditRecord {
  id: string;
  timestamp: string;
  who: string;
  what: string;
  why: string;
  skillId: string;
  provider: string;
  ventureId: string;
  action: string;
  outcome: "approved" | "denied" | "executed" | "failed" | "rolled_back";
  result: string;
  costEstimate: number;
  latencyMs: number;
  rollback?: boolean;
  approval: ApprovalType;
  signature: string;
  riskLevel: RiskLevel;
}

export interface GovernanceTelemetryRecord {
  id: string;
  timestamp: string;
  skillId: string;
  executionTimeMs: number;
  approvalTimeMs: number;
  riskLevel: RiskLevel;
  failures: number;
  retries: number;
  policyViolations: number;
  costEstimate: number;
  provider: string;
  confidence: number;
}

export interface GovernanceRequest extends SkillRequest {
  founderId?: string;
  organizationId?: string;
  sandboxMode?: SandboxMode;
  emergency?: boolean;
}

export interface GovernanceResult {
  requestId: string;
  governancePassed: boolean;
  risk: RiskAssessment;
  approval: ApprovalDecision;
  policies: PolicyEvaluationResult;
  sandboxMode: SandboxMode;
  rollbackPlan: RollbackPlan;
  skillResult?: SkillResult;
  auditId: string;
  telemetryId: string;
  blockedReason?: string;
  stages: GovernanceStage[];
  latencyMs: number;
}

export type GovernanceStage =
  | "request"
  | "risk"
  | "permission"
  | "approval"
  | "policy"
  | "execution"
  | "audit"
  | "memory"
  | "decision_graph"
  | "telemetry";

export interface ApprovalQueueItem {
  id: string;
  skillId: string;
  ventureId: string;
  requestedBy: MeshDepartmentId;
  action: string;
  riskLevel: RiskLevel;
  approvalType: ApprovalType;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
}
