/** ForgeOS Analytics Skills — shared types (RC4.6). */

import type { MeshDepartmentId } from "@/lib/executive-mesh/types";
import type { SkillCategory, SkillDefinition, SkillStatus } from "@/lib/skills/types";
import type { RiskLevel, RollbackPlan, SandboxMode } from "@/lib/skills-governance/types";

export type AnalyticsDomain =
  | "dashboards"
  | "reports"
  | "kpis"
  | "forecast"
  | "predictions"
  | "metrics";

export type AnalyticsActionRisk = "low" | "medium" | "high";

export interface AnalyticsActionDef {
  id: string;
  label: string;
  description: string;
  risk: AnalyticsActionRisk;
}

export interface AnalyticsProviderDef {
  domain: AnalyticsDomain;
  skillId: string;
  name: string;
  category: SkillCategory;
  provider: string;
  capability: string;
  actions: AnalyticsActionDef[];
  risks: string[];
  status?: SkillStatus;
  allowedDepartments?: MeshDepartmentId[];
}

export interface AnalyticsPermissionConfig {
  skillId: string;
  scopes: string[];
  allowedDepartments: MeshDepartmentId[];
  requireApproval: boolean;
}

export interface AnalyticsPolicyConfig {
  id: string;
  maxCostPerCall: number;
  timeoutMs: number;
  requireApproval: boolean;
  sandboxOnly: boolean;
  allowedDepartments: MeshDepartmentId[];
}

export interface AnalyticsActionRiskMap {
  action: string;
  level: RiskLevel;
  score: number;
  factors: string[];
}

export interface AnalyticsTelemetryMeta {
  skillId: string;
  provider: string;
  domain: AnalyticsDomain;
  metrics: string[];
  trackLatency: boolean;
  trackCost: boolean;
}

export interface AnalyticsAuditShape {
  skillId: string;
  domain: AnalyticsDomain;
  action: string;
  ventureId: string;
  requestedBy: MeshDepartmentId;
  outcome: "planned" | "executed" | "failed" | "rolled_back";
  sandbox: true;
  details: string;
}

export interface AnalyticsSandboxConfig {
  skillId: string;
  defaultMode: SandboxMode;
  allowProduction: false;
  mockDataPrefix: string;
  networkAccess: false;
  realApiCalls: false;
}

export interface AnalyticsProviderModule {
  def: AnalyticsProviderDef;
  registry: SkillDefinition;
  permissions: AnalyticsPermissionConfig;
  policies: AnalyticsPolicyConfig;
  telemetry: AnalyticsTelemetryMeta;
  assessActionRisk: (action: string) => AnalyticsActionRiskMap;
  buildRollback: () => RollbackPlan;
  buildAuditShape: (params: {
    action: string;
    ventureId: string;
    requestedBy: MeshDepartmentId;
    outcome: AnalyticsAuditShape["outcome"];
    details: string;
  }) => AnalyticsAuditShape;
  sandbox: AnalyticsSandboxConfig;
}
