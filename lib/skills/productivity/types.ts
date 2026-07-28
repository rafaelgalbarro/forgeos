/** ForgeOS Productivity Skills — shared types (RC4.3). */

import type { SkillContext, SkillDefinition, SkillMockResult, SkillRoutingDecision } from "@/lib/skills/types";
import type { RiskLevel, SandboxMode } from "@/lib/skills-governance/types";

export type ProductivityProviderId =
  | "email"
  | "calendar"
  | "files"
  | "documents"
  | "messaging"
  | "meetings"
  | "knowledge";

export type ProductivityActionRisk = "low" | "medium" | "high";

export interface ProductivityAction {
  id: string;
  name: string;
  description: string;
  risk: ProductivityActionRisk;
}

export interface ProductivityTelemetryMeta {
  provider: ProductivityProviderId;
  trackLatency: boolean;
  trackCost: boolean;
  sampleRate: number;
}

export interface ProductivityAuditShape {
  fields: string[];
  retentionDays: number;
  includePayload: boolean;
}

export interface ProductivitySkillMetadata {
  id: string;
  name: string;
  provider: ProductivityProviderId;
  category: "productivity";
  actions: ProductivityAction[];
  risks: string[];
  status: "sandbox";
  permissions: string[];
  telemetry: ProductivityTelemetryMeta;
  auditShape: ProductivityAuditShape;
}

export interface ProductivitySkillPolicy {
  id: string;
  maxCostPerCall: number;
  timeoutMs: number;
  requireApproval: boolean;
  sandboxOnly: true;
  allowedActions: string[];
}

export interface ProductivityRiskAssessment {
  level: RiskLevel;
  score: number;
  factors: string[];
  sandboxMode: SandboxMode;
}

export interface ProductivityRollbackPlan {
  skillId: string;
  steps: string[];
  recoveryPlan: string[];
  compensationActions: string[];
}

export interface ProductivitySandboxConfig {
  mode: SandboxMode;
  mockDataEnabled: boolean;
  productionDefault: false;
  credentialCheck: false;
}

export interface ProductivityAdapterResult {
  runtimeSessionId: string;
  mock: SkillMockResult;
}

export interface ProductivityProviderModule {
  metadata: ProductivitySkillMetadata;
  definition: SkillDefinition;
  permissions: string[];
  policy: ProductivitySkillPolicy;
  assessRisk: (action: string) => ProductivityRiskAssessment;
  buildRollback: (action: string) => ProductivityRollbackPlan;
  executeMock: (context: SkillContext, routing: SkillRoutingDecision) => SkillMockResult;
  sandbox: ProductivitySandboxConfig;
  executeViaAdapter: (
    context: SkillContext,
    routing: SkillRoutingDecision,
    executionId: string
  ) => ProductivityAdapterResult;
}

export interface ProductivityProviderConfig {
  id: string;
  name: string;
  provider: ProductivityProviderId;
  capability: string;
  actions: ProductivityAction[];
  risks: string[];
  permissions: string[];
  mockData?: Record<string, unknown>;
}
