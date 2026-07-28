/** ForgeOS Business Skills — shared types (RC4.4). */

import type { MeshDepartmentId } from "@/lib/executive-mesh/types";
import type { SkillCategory, SkillDefinition, SkillStatus } from "@/lib/skills/types";
import type { RiskLevel, SandboxMode } from "@/lib/skills-governance/types";

export type BusinessDomain =
  | "crm"
  | "erp"
  | "accounting"
  | "payments"
  | "contracts"
  | "billing"
  | "invoices"
  | "customers";

export type BusinessActionRisk = "low" | "medium" | "high" | "critical";

export interface BusinessActionDef {
  id: string;
  label: string;
  description: string;
  risk: BusinessActionRisk;
}

export interface BusinessProviderDef {
  domain: BusinessDomain;
  skillId: string;
  name: string;
  category: SkillCategory;
  provider: string;
  capability: string;
  actions: BusinessActionDef[];
  risks: string[];
  status?: SkillStatus;
  allowedDepartments?: MeshDepartmentId[];
}

export interface BusinessPermissionConfig {
  skillId: string;
  scopes: string[];
  allowedDepartments: MeshDepartmentId[];
  requireApproval: boolean;
}

export interface BusinessPolicyConfig {
  id: string;
  maxCostPerCall: number;
  timeoutMs: number;
  requireApproval: boolean;
  sandboxOnly: boolean;
  allowedDepartments: MeshDepartmentId[];
}

export interface BusinessActionRiskMap {
  action: string;
  level: RiskLevel;
  score: number;
  factors: string[];
}

export interface BusinessRollbackConfig {
  skillId: string;
  steps: string[];
  recoveryPlan: string[];
  compensationActions: string[];
}

export interface BusinessTelemetryMeta {
  skillId: string;
  provider: string;
  domain: BusinessDomain;
  trackLatency: boolean;
  trackCost: boolean;
  trackFailures: boolean;
}

export interface BusinessAuditShape {
  skillId: string;
  domain: BusinessDomain;
  action: string;
  ventureId: string;
  requestedBy: MeshDepartmentId;
  outcome: "planned" | "executed" | "failed" | "rolled_back";
  sandbox: true;
  details: string;
}

export interface BusinessSandboxConfig {
  skillId: string;
  defaultMode: SandboxMode;
  allowProduction: false;
  mockDataPrefix: string;
}

export interface BusinessProviderModule {
  def: BusinessProviderDef;
  registry: SkillDefinition;
  permissions: BusinessPermissionConfig;
  policies: BusinessPolicyConfig;
  telemetry: BusinessTelemetryMeta;
}
