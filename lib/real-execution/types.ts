/** ForgeOS Real Execution Approval Layer — core types (RC5.1). */

import type { ConnectionPlan, ConnectionProvider, ConnectionResult } from "@/lib/connections/shared/types";
import type { RiskAssessment } from "@/lib/skills-governance/types";
import type { RealConnectionCapability } from "@/lib/connections/shared/types";

export type ExecutionMode = "dry_run" | "sandbox" | "real";

export type ApprovalSessionStatus = "pending" | "approved" | "rejected" | "expired";

export interface ApprovalSession {
  id: string;
  capabilityId: RealConnectionCapability;
  provider: ConnectionProvider;
  operation: string;
  ventureId: string;
  requestedBy: string;
  approvedBy?: string;
  rejectedBy?: string;
  status: ApprovalSessionStatus;
  riskLevel: string;
  requiredPermissions: string[];
  dryRunPlanId?: string;
  createdAt: string;
  expiresAt: string;
  resolvedAt?: string;
  rationale?: string;
}

export interface ExecutionRequest {
  requestId: string;
  capabilityId: RealConnectionCapability;
  provider: ConnectionProvider;
  operation: string;
  ventureId: string;
  requestedBy: string;
  approvedBy?: string;
  mode: ExecutionMode;
  payload?: Record<string, unknown>;
  approvalSessionId?: string;
  dryRunPlan?: ConnectionPlan;
  risk?: RiskAssessment;
  requiredPermissions?: string[];
}

export interface ExecutionGate {
  id: string;
  name: string;
  passed: boolean;
  reason: string;
}

export interface ExecutionResult {
  requestId: string;
  success: boolean;
  executed: boolean;
  mode: ExecutionMode;
  capabilityId: string;
  provider: ConnectionProvider;
  output: string;
  connectionResult?: ConnectionResult;
  rollbackPlan?: ConnectionPlan;
  gates: ExecutionGate[];
  allGatesPassed: boolean;
  blockedReason?: string;
  auditId: string;
  approvalSessionId?: string;
  risk?: RiskAssessment;
  latencyMs: number;
}

export interface AllowedAction {
  capabilityId: RealConnectionCapability;
  provider: ConnectionProvider;
  operation: string;
  description: string;
  maxMode: ExecutionMode;
}

export interface ForbiddenAction {
  pattern: string;
  reason: string;
  category: "destructive" | "production" | "dns" | "credential" | "other";
}

export interface ExecutionAuditEntry {
  id: string;
  timestamp: string;
  requestId: string;
  capabilityId: string;
  provider: ConnectionProvider;
  operation: string;
  ventureId: string;
  requestedBy: string;
  approvedBy?: string;
  mode: ExecutionMode;
  outcome: "planned" | "dry_run" | "approval_requested" | "approved" | "blocked" | "executed" | "failed";
  gatesSummary: string;
  details: string;
  riskLevel: string;
}
