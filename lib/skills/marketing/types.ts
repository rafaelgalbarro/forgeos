/** ForgeOS Marketing Skills — shared types (RC4.5). */

import type { RiskLevel } from "@/lib/skills-governance/types";
import type { SkillDefinition, SkillMockResult, SkillStatus } from "@/lib/skills/types";

export type MarketingDomain =
  | "campaigns"
  | "seo"
  | "analytics"
  | "ads"
  | "social"
  | "content"
  | "email"
  | "automation";

export interface MarketingSkillAction {
  id: string;
  name: string;
  description: string;
  riskLevel: RiskLevel;
}

export interface MarketingProviderConfig {
  domain: MarketingDomain;
  id: string;
  name: string;
  provider: string;
  capability: string;
  actions: MarketingSkillAction[];
  risks: string[];
  status?: SkillStatus;
  estimatedCostPerCall?: number;
  estimatedLatencyMs?: number;
}

export interface MarketingProviderModule {
  config: MarketingProviderConfig;
  skill: SkillDefinition;
  actions: MarketingSkillAction[];
  permissions: MarketingPermissionConfig;
  policies: MarketingPolicyConfig;
  sandbox: MarketingSandboxConfig;
  telemetryDefaults: MarketingTelemetryMeta;
  auditShape: MarketingAuditShape;
}

export interface MarketingPermissionConfig {
  scopes: string[];
  allowedDepartments: string[];
  requireApprovalActions: string[];
}

export interface MarketingPolicyConfig {
  id: string;
  maxCostPerCall: number;
  timeoutMs: number;
  sandboxOnly: boolean;
  requireApprovalActions: string[];
  blockedActions: string[];
}

export interface MarketingSandboxConfig {
  defaultMode: "simulation" | "dry_run" | "sandbox";
  allowProduction: false;
  mockDelayMs: number;
}

export interface MarketingTelemetryMeta {
  domain: MarketingDomain;
  provider: string;
  trackCost: boolean;
  trackLatency: boolean;
  sampleRate: number;
}

export interface MarketingAuditShape {
  eventType: string;
  fields: string[];
  retentionDays: number;
}

export interface MarketingMockContext {
  ventureId: string;
  action: string;
  payload?: Record<string, unknown>;
  requestedBy: string;
}

export interface MarketingMockExecutor {
  execute: (
    config: MarketingProviderConfig,
    context: MarketingMockContext
  ) => SkillMockResult;
}

export interface MarketingRollbackPlan {
  skillId: string;
  action: string;
  steps: string[];
  recoveryPlan: string[];
  compensationActions: string[];
}

export interface MarketingRiskAssessment {
  action: string;
  level: RiskLevel;
  score: number;
  factors: string[];
}
