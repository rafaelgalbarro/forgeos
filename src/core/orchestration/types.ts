/** PROGRAM 6030 — Orchestration Kernel V2 shared types. */

import type { CostEstimate, DepartmentId, DurationEstimate } from "../domain/types";
import type { CapabilityName } from "../domain/capabilities";

export const ORCHESTRATION_VERSION = "PROGRAM 6030 — ORCHESTRATION KERNEL V2" as const;

export type WorkflowNodeType =
  | "UNDERSTAND"
  | "RESEARCH"
  | "DECIDE"
  | "PLAN"
  | "GENERATE_ARTIFACT"
  | "GENERATE_OUTPUT"
  | "GENERATE_CODEBASE"
  | "BUILD"
  | "VALIDATE"
  | "CREATE_PREVIEW"
  | "APPROVE"
  | "CREATE_RELEASE"
  | "DEPLOY"
  | "OPERATE"
  | "EVOLVE";

export type NodeStatus =
  | "pending"
  | "ready"
  | "running"
  | "blocked"
  | "awaiting_approval"
  | "completed"
  | "failed"
  | "skipped"
  | "cancelled";

export type PlanStatus =
  | "draft"
  | "pending_approval"
  | "approved"
  | "executing"
  | "paused"
  | "completed"
  | "failed"
  | "cancelled";

export type MissionKernelStatus =
  | "created"
  | "planning"
  | "awaiting_approval"
  | "running"
  | "paused"
  | "completed"
  | "failed"
  | "cancelled";

export type ExecutionMode =
  | "MANUAL"
  | "ASSISTED"
  | "AUTOPILOT"
  | "DRY_RUN"
  | "PREVIEW_ONLY";

export type DecisionGateType =
  | "INFORMATION"
  | "RECOMMENDATION"
  | "APPROVAL"
  | "SECURITY_APPROVAL"
  | "FINANCIAL_APPROVAL"
  | "DEPLOYMENT_APPROVAL";

export type RecoveryActionType =
  | "retry"
  | "retry_with_change"
  | "skip_optional"
  | "pause"
  | "resume"
  | "cancel"
  | "logical_rollback"
  | "repair_plan"
  | "human_intervention";

export type OutputRequirement = "required" | "optional" | "excluded";

export interface RetryPolicy {
  maxAttempts: number;
  backoffMs: number;
  retryable: boolean;
}

export interface ApprovalPolicy {
  required: boolean;
  gate: DecisionGateType;
  autoApproveInDryRun?: boolean;
}

export interface WorkflowNode {
  nodeId: string;
  type: WorkflowNodeType;
  capability?: CapabilityName;
  label: string;
  stageId: string;
  inputReferences: string[];
  outputContract: string;
  dependencies: string[];
  executionMode: ExecutionMode;
  retryPolicy: RetryPolicy;
  timeoutMs: number;
  approvalPolicy: ApprovalPolicy;
  status: NodeStatus;
  assignedDepartment: DepartmentId;
  optional?: boolean;
  weight: number;
  progress: number;
  attempt: number;
  error?: string;
  artifactRefs: string[];
  startedAt?: string;
  finishedAt?: string;
}

export interface WorkflowStage {
  stageId: string;
  label: string;
  nodeIds: string[];
  status: NodeStatus;
  progress: number;
  weight: number;
}

export interface PlanDependencyEdge {
  from: string;
  to: string;
  reason: string;
}

export interface ApprovalRecord {
  approvalId: string;
  gate: DecisionGateType;
  nodeId?: string;
  status: "pending" | "granted" | "denied";
  requestedAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
  rationale?: string;
}

export interface PlanPolicyBundle {
  productionAutoActivate: false;
  maxConcurrency: number;
  maxWorkspaceCount: number;
  maxProviderCalls: number;
  maxEstimatedCost: CostEstimate;
  allowParallelism: boolean;
  cancellationPropagates: boolean;
}

export interface MissionExecutionPlan {
  planId: string;
  missionId: string;
  version: number;
  objective: string;
  stages: WorkflowStage[];
  nodes: WorkflowNode[];
  dependencies: PlanDependencyEdge[];
  approvals: ApprovalRecord[];
  policies: PlanPolicyBundle;
  estimatedCost: CostEstimate;
  estimatedDuration: DurationEstimate;
  status: PlanStatus;
  executionMode: ExecutionMode;
  createdAt: string;
  updatedAt: string;
}

export interface OutputSelectionItem {
  kind: string;
  requirement: OutputRequirement;
  order: number;
  parallelWith: string[];
  estimatedCost: CostEstimate;
  estimatedDuration: DurationEstimate;
  reason: string;
}

export interface OutputSelectionDecision {
  decisionId: string;
  missionId: string;
  items: OutputSelectionItem[];
  status: "proposed" | "approved" | "rejected";
  explanation: string;
}

export interface DagValidationIssue {
  code:
    | "CYCLE"
    | "MISSING_DEPENDENCY"
    | "UNAVAILABLE_OUTPUT"
    | "IMPOSSIBLE_STAGE"
    | "EXECUTION_CONFLICT";
  message: string;
  nodeIds: string[];
}

export interface DagValidationResult {
  ok: boolean;
  issues: DagValidationIssue[];
  topologicalOrder: string[];
}

export interface ProgressBreakdown {
  mission: number;
  stage: Record<string, number>;
  output: number;
  build: number;
  deployment: number;
}

export interface ConcurrencyLimits {
  maxConcurrency: number;
  maxWorkspaceCount: number;
  maxProviderCalls: number;
  maxEstimatedCostAmount: number;
}
