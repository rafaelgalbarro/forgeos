/** ForgeOS Marketing Skills — provider module factory (RC4.5). */

import type { RiskLevel } from "@/lib/skills-governance/types";
import type { SkillDefinition, SkillMockResult } from "@/lib/skills/types";
import { dispatchSkillToRuntime } from "@/lib/skills/adapters/runtime-adapter";
import type {
  MarketingAuditShape,
  MarketingMockContext,
  MarketingPermissionConfig,
  MarketingPolicyConfig,
  MarketingProviderConfig,
  MarketingProviderModule,
  MarketingRiskAssessment,
  MarketingRollbackPlan,
  MarketingSandboxConfig,
  MarketingTelemetryMeta,
} from "../types";

const RISK_SCORES: Record<RiskLevel, number> = {
  LOW: 15,
  MEDIUM: 45,
  HIGH: 75,
  CRITICAL: 95,
};

function buildSkillDefinition(config: MarketingProviderConfig): SkillDefinition {
  return {
    id: config.id,
    name: config.name,
    category: "marketing",
    version: "1.0.0",
    provider: config.provider,
    requiredCredentials: [`${config.provider.toUpperCase()}_SANDBOX_TOKEN`],
    estimatedCostPerCall: config.estimatedCostPerCall ?? 0.002,
    estimatedLatencyMs: config.estimatedLatencyMs ?? 350,
    permissions: config.actions.map((a) => `${config.id}:${a.id}`),
    risks: config.risks,
    capability: config.capability,
    status: config.status ?? "sandbox",
    health: "healthy",
  };
}

function buildPermissions(config: MarketingProviderConfig): MarketingPermissionConfig {
  const highRiskActions = config.actions
    .filter((a) => a.riskLevel === "HIGH" || a.riskLevel === "CRITICAL")
    .map((a) => a.id);
  return {
    scopes: config.actions.map((a) => `${config.id}:${a.id}`),
    allowedDepartments: ["ceo", "cmo", "growth"],
    requireApprovalActions: highRiskActions,
  };
}

function buildPolicies(config: MarketingProviderConfig): MarketingPolicyConfig {
  const highRiskActions = config.actions
    .filter((a) => a.riskLevel === "HIGH" || a.riskLevel === "CRITICAL")
    .map((a) => a.id);
  return {
    id: `policy-marketing-${config.domain}`,
    maxCostPerCall: config.estimatedCostPerCall ?? 0.5,
    timeoutMs: 30_000,
    sandboxOnly: true,
    requireApprovalActions: highRiskActions,
    blockedActions: [],
  };
}

function buildSandbox(config: MarketingProviderConfig): MarketingSandboxConfig {
  const hasHighRisk = config.actions.some(
    (a) => a.riskLevel === "HIGH" || a.riskLevel === "CRITICAL"
  );
  return {
    defaultMode: hasHighRisk ? "sandbox" : "simulation",
    allowProduction: false,
    mockDelayMs: 120,
  };
}

function buildTelemetryMeta(config: MarketingProviderConfig): MarketingTelemetryMeta {
  return {
    domain: config.domain,
    provider: config.provider,
    trackCost: config.risks.includes("financial") || config.risks.includes("ad_spend"),
    trackLatency: true,
    sampleRate: 1,
  };
}

function buildAuditShape(config: MarketingProviderConfig): MarketingAuditShape {
  return {
    eventType: `marketing.${config.domain}.executed`,
    fields: [
      "skillId",
      "action",
      "ventureId",
      "requestedBy",
      "outcome",
      "sandboxMode",
      "costEstimate",
      "latencyMs",
    ],
    retentionDays: 90,
  };
}

export function assessActionRisk(
  config: MarketingProviderConfig,
  action: string
): MarketingRiskAssessment {
  const actionDef = config.actions.find((a) => a.id === action);
  const level = actionDef?.riskLevel ?? "LOW";
  const factors = [`Marketing ${config.domain} action: ${action}`];
  if (config.risks.includes("financial")) factors.push("Financial exposure");
  if (config.risks.includes("ad_spend")) factors.push("Ad spend risk");
  if (config.risks.includes("spam_compliance")) factors.push("Email compliance risk");
  return { action, level, score: RISK_SCORES[level], factors };
}

export function buildRollbackPlan(
  config: MarketingProviderConfig,
  action: string
): MarketingRollbackPlan {
  return {
    skillId: config.id,
    action,
    steps: [
      `Revert ${config.domain} state for action "${action}"`,
      "Notify CMO department",
      "Mark audit log as rolled_back",
    ],
    recoveryPlan: [
      "Retry in sandbox mode",
      "Escalate to CEO if repeated failure",
      "Review governance policies",
    ],
    compensationActions: [
      `Compensate ${config.domain} side effects`,
      "Update decision graph with rollback note",
    ],
  };
}

export function executeMock(
  config: MarketingProviderConfig,
  context: MarketingMockContext
): SkillMockResult {
  const actionDef = config.actions.find((a) => a.id === context.action);
  if (!actionDef) {
    return {
      success: false,
      output: `[MOCK] Unknown action "${context.action}" for ${config.name}`,
      mock: true,
    };
  }

  const mockId = `${config.domain}-${Date.now()}`;
  const output = `[MOCK] ${config.name}: ${actionDef.name} completed for venture ${context.ventureId} (sandbox)`;

  return {
    success: true,
    output,
    data: {
      mockId,
      skillId: config.id,
      domain: config.domain,
      action: context.action,
      actionName: actionDef.name,
      sandbox: true,
      requestedBy: context.requestedBy,
      payload: context.payload ?? {},
      metrics: {
        impressions: Math.floor(Math.random() * 10000),
        clicks: Math.floor(Math.random() * 500),
        conversions: Math.floor(Math.random() * 50),
      },
    },
    mock: true,
  };
}

export function dispatchToRuntime(
  config: MarketingProviderConfig,
  params: { ventureId: string; executionId: string; action: string }
) {
  return dispatchSkillToRuntime({
    skillId: config.id,
    ventureId: params.ventureId,
    executionId: params.executionId,
    action: params.action,
  });
}

export function createProviderModule(config: MarketingProviderConfig): MarketingProviderModule {
  return {
    config,
    skill: buildSkillDefinition(config),
    actions: config.actions,
    permissions: buildPermissions(config),
    policies: buildPolicies(config),
    sandbox: buildSandbox(config),
    telemetryDefaults: buildTelemetryMeta(config),
    auditShape: buildAuditShape(config),
  };
}

export function createProviderExports(config: MarketingProviderConfig) {
  const mod = createProviderModule(config);
  return {
    config,
    SKILL: mod.skill,
    ACTIONS: mod.actions,
    PERMISSIONS: mod.permissions,
    POLICIES: mod.policies,
    SANDBOX: mod.sandbox,
    TELEMETRY: mod.telemetryDefaults,
    AUDIT_SHAPE: mod.auditShape,
    assessRisk: (action: string) => assessActionRisk(config, action),
    buildRollback: (action: string) => buildRollbackPlan(config, action),
    executeMock: (context: MarketingMockContext) => executeMock(config, context),
    dispatchToRuntime: (params: { ventureId: string; executionId: string; action: string }) =>
      dispatchToRuntime(config, params),
  };
}
