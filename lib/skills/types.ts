/** ForgeOS Skills Framework — core types (RC4). */

import type { MeshDepartmentId } from "@/lib/executive-mesh/types";

export type SkillCategory =
  | "communication"
  | "crm"
  | "documents"
  | "development"
  | "cicd"
  | "cloud"
  | "database"
  | "payments"
  | "analytics"
  | "marketing"
  | "finance"
  | "legal"
  | "storage"
  | "productivity"
  | "ai";

export type SkillStatus = "active" | "deprecated" | "disabled" | "sandbox";
export type SkillHealth = "healthy" | "degraded" | "unavailable";

export interface SkillDefinition {
  id: string;
  name: string;
  category: SkillCategory;
  version: string;
  provider: string;
  requiredCredentials: string[];
  estimatedCostPerCall: number;
  estimatedLatencyMs: number;
  permissions: string[];
  risks: string[];
  capability: string;
  status: SkillStatus;
  health: SkillHealth;
}

export interface SkillContext {
  ventureId: string;
  requestedBy: MeshDepartmentId;
  approvedBy?: MeshDepartmentId;
  action: string;
  payload?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface SkillRoutingDecision {
  skillId: string;
  provider: string;
  policy: string;
  timeoutMs: number;
  fallbackSkillId?: string;
  auditLevel: "full" | "standard" | "minimal";
  rationale: string;
}

export interface SkillExecutionPlan {
  steps: string[];
  recoveryPlan: string[];
  rollbackSteps: string[];
  estimatedDurationMs: number;
}

export interface SkillMockResult {
  success: boolean;
  output: string;
  data?: Record<string, unknown>;
  mock: true;
}

export interface SkillResult {
  executionId: string;
  skillId: string;
  provider: string;
  success: boolean;
  output: string;
  mock: boolean;
  executionPlan: SkillExecutionPlan;
  costEstimate: number;
  latencyMs: number;
  confidence: number;
  reasoning: string;
  errors: string[];
  warnings: string[];
  auditLogId: string;
  telemetryId: string;
  memoryRecordId?: string;
  runtimeSessionId?: string;
}

export interface SkillAuditLog {
  id: string;
  timestamp: string;
  skillId: string;
  ventureId: string;
  requestedBy: MeshDepartmentId;
  approvedBy?: MeshDepartmentId;
  action: string;
  scopes: string[];
  policy: string;
  outcome: "planned" | "executed" | "failed" | "rolled_back";
  details: string;
}

export interface SkillTelemetryRecord {
  id: string;
  timestamp: string;
  skillId: string;
  provider: string;
  latencyMs: number;
  costEstimate: number;
  success: boolean;
  fallbackUsed: boolean;
  rateLimitHit: boolean;
}

export interface SkillMemoryRecord {
  id: string;
  timestamp: string;
  ventureId: string;
  skillId: string;
  requestedBy: MeshDepartmentId;
  approvedBy?: MeshDepartmentId;
  executedBy: string;
  result: string;
  errors: string[];
  costEstimate: number;
  latencyMs: number;
  reasoning: string;
  confidence: number;
}

export interface SkillRequest {
  skillId: string;
  context: SkillContext;
  preferredProvider?: string;
}

export interface SkillPolicy {
  id: string;
  maxCostPerCall: number;
  timeoutMs: number;
  requireApproval: boolean;
  allowedDepartments: MeshDepartmentId[];
  sandboxOnly: boolean;
}
