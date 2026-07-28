/** ForgeOS AI Capability Skills — shared types (RC4.7). */

import type { MeshDepartmentId } from "@/lib/executive-mesh/types";
import type { AIRuntimeResponse } from "@/lib/ai-runtime/types";
import type { RiskLevel, RollbackPlan, SandboxMode } from "@/lib/skills-governance/types";
import type {
  SkillContext,
  SkillDefinition,
  SkillMockResult,
  SkillPolicy,
  SkillRoutingDecision,
} from "@/lib/skills/types";

export type AICapabilityDomain =
  | "reasoning"
  | "coding"
  | "vision"
  | "voice"
  | "translation"
  | "search"
  | "memory"
  | "ocr"
  | "embeddings"
  | "rag"
  | "images"
  | "video"
  | "audio";

export interface AICapabilityAction {
  id: string;
  name: string;
  risk: RiskLevel;
}

export interface AICapabilityConfig {
  id: string;
  name: string;
  domain: AICapabilityDomain;
  capability: string;
  actions: AICapabilityAction[];
  risks: string[];
  runtimeTask: "code" | "classification" | "research" | "marketing";
}

export interface AICapabilityPermissions {
  skillId: string;
  defaultScopes: string[];
  actionScopes: Record<string, string[]>;
  allowedDepartments: MeshDepartmentId[];
}

export interface AICapabilityPolicies {
  skillId: string;
  constraints: SkillPolicy;
  aiUsagePolicy: "ai_usage";
  actionConstraints: Record<string, string[]>;
}

export interface AICapabilityRiskAssessment {
  action: string;
  level: RiskLevel;
  score: number;
  factors: string[];
  sandboxMode: SandboxMode;
}

export interface AICapabilityTelemetryMeta {
  skillId: string;
  domain: AICapabilityDomain;
  provider: "ai-runtime";
  metrics: string[];
  sampleLatencyMs: number;
}

export interface AICapabilityAuditShape {
  eventType: "AI_CAPABILITY_EXECUTION";
  skillId: string;
  domain: AICapabilityDomain;
  action: string;
  ventureId: string;
  requestedBy: string;
  outcome: "planned" | "executed" | "failed" | "rolled_back";
  sandbox: true;
  routedVia: "ai-runtime";
  runtimeSessionId?: string;
  telemetryId?: string;
  timestamp: string;
  details: string;
}

export interface AICapabilitySandboxConfig {
  skillId: string;
  defaultMode: SandboxMode;
  allowProduction: false;
  networkAccess: false;
  realApiCalls: false;
  aiRuntimeOnly: true;
}

export interface AICapabilityAdapterResult {
  runtimeSessionId: string;
  mock: SkillMockResult;
  aiRuntime?: AIRuntimeResponse;
}

export interface AICapabilityModule {
  config: AICapabilityConfig;
  registry: SkillDefinition;
  permissions: AICapabilityPermissions;
  policies: AICapabilityPolicies;
  assessActionRisk: (action: string) => AICapabilityRiskAssessment;
  buildRollbackPlan: (action: string) => RollbackPlan;
  telemetryMeta: AICapabilityTelemetryMeta;
  buildAuditEvent: (params: {
    action: string;
    ventureId: string;
    requestedBy: string;
    outcome: AICapabilityAuditShape["outcome"];
    runtimeSessionId?: string;
    details: string;
  }) => AICapabilityAuditShape;
  executeMock: (action: string, context: SkillContext, routing: SkillRoutingDecision) => SkillMockResult;
  sandbox: AICapabilitySandboxConfig;
  routeViaAdapter: (params: {
    ventureId: string;
    executionId: string;
    action: string;
    context: SkillContext;
    routing: SkillRoutingDecision;
  }) => Promise<AICapabilityAdapterResult>;
}
