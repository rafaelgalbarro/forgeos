/** ForgeOS Capability Layer — core types (RC4.9). */

import type { MeshDepartmentId } from "@/lib/executive-mesh/types";

export type CapabilityCategory =
  | "development"
  | "productivity"
  | "marketing"
  | "research"
  | "business"
  | "analytics"
  | "project"
  | "venture";

export type CapabilityStatus = "active" | "deprecated" | "disabled" | "sandbox";
export type CapabilityHealth = "healthy" | "degraded" | "unavailable";
export type CapabilityRisk = "low" | "medium" | "high" | "critical";
export type CapabilityPriority = "low" | "normal" | "high" | "critical";

export interface CapabilityDefinition {
  id: string;
  name: string;
  category: CapabilityCategory;
  description: string;
  authorizedDepartments: MeshDepartmentId[];
  compatibleWorkers: string[];
  compatibleSkills: string[];
  compatibleProviders: string[];
  risk: CapabilityRisk;
  estimatedCost: number;
  estimatedLatency: number;
  priority: CapabilityPriority;
  version: string;
  health: CapabilityHealth;
  status: CapabilityStatus;
}

export interface CapabilityContext {
  ventureId: string;
  requestedBy: MeshDepartmentId;
  approvedBy?: MeshDepartmentId;
  action: string;
  payload?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface CapabilityRequest {
  capabilityId: string;
  context: CapabilityContext;
  preferredProvider?: string;
  preferredSkill?: string;
}

export interface CapabilityPolicy {
  id: string;
  maxCostPerCall: number;
  timeoutMs: number;
  requireApproval: boolean;
  allowedDepartments: MeshDepartmentId[];
  sandboxOnly: boolean;
  auditLevel: "full" | "standard" | "minimal";
}

export interface CapabilityApproval {
  required: boolean;
  approved: boolean;
  approvers: MeshDepartmentId[];
  rationale: string;
  signature: string;
}

export interface CapabilityResolution {
  capabilityId: string;
  primarySkillId: string;
  provider: string;
  policy: CapabilityPolicy;
  approval: CapabilityApproval;
  fallbackSkillIds: string[];
  sandboxMode: boolean;
  rationale: string;
}

export interface CapabilityPlanStep {
  stepId: string;
  skillId: string;
  provider: string;
  action: string;
  dependsOn: string[];
  order: number;
  rollbackAction?: string;
}

export interface CapabilityExecutionPlan {
  planId: string;
  capabilityId: string;
  steps: CapabilityPlanStep[];
  dependencies: Record<string, string[]>;
  order: string[];
  rollback: string[];
  recovery: string[];
  approvalRequired: boolean;
  estimatedDurationMs: number;
  estimatedCost: number;
}

export interface CapabilitySkillResult {
  skillId: string;
  provider: string;
  success: boolean;
  output: string;
  latencyMs: number;
  costEstimate: number;
  executionId: string;
}

export interface CapabilityResult {
  requestId: string;
  capabilityId: string;
  success: boolean;
  output: string;
  resolution: CapabilityResolution;
  executionPlan: CapabilityExecutionPlan;
  skillResults: CapabilitySkillResult[];
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
  stages: string[];
}

export interface CapabilityAuditLog {
  id: string;
  timestamp: string;
  capabilityId: string;
  ventureId: string;
  requestedBy: MeshDepartmentId;
  approvedBy?: MeshDepartmentId;
  action: string;
  policy: string;
  outcome: "planned" | "executed" | "failed" | "rolled_back" | "blocked";
  details: string;
}

export interface CapabilityTelemetryRecord {
  id: string;
  timestamp: string;
  capabilityId: string;
  skillId: string;
  provider: string;
  latencyMs: number;
  costEstimate: number;
  success: boolean;
  fallbackUsed: boolean;
  sandboxMode: boolean;
}

export interface CapabilityMemoryRecord {
  id: string;
  timestamp: string;
  ventureId: string;
  capabilityId: string;
  requestedBy: MeshDepartmentId;
  result: string;
  skillIds: string[];
  costEstimate: number;
  latencyMs: number;
  confidence: number;
}

export interface CapabilityMetric {
  capabilityId: string;
  totalCalls: number;
  successRate: number;
  avgLatencyMs: number;
  avgCost: number;
  lastExecutedAt?: string;
}

export interface CapabilityEvent {
  id: string;
  timestamp: string;
  stage: string;
  capabilityId: string;
  ventureId: string;
  message: string;
  success: boolean;
}
