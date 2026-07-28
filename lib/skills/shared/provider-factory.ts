/** ForgeOS — shared provider skill module factory (RC4.2). */

import type { RiskLevel, RollbackPlan, SandboxMode } from "@/lib/skills-governance/types";
import { dispatchSkillToRuntime } from "@/lib/skills/adapters/runtime-adapter";
import type {
  SkillCategory,
  SkillContext,
  SkillDefinition,
  SkillMockResult,
  SkillPolicy,
  SkillStatus,
} from "@/lib/skills/types";

export interface ProviderActionDef {
  id: string;
  name: string;
  risk: RiskLevel;
}

export interface ProviderModuleConfig {
  id: string;
  name: string;
  category: SkillCategory;
  provider: string;
  capability: string;
  credential: string;
  risks: string[];
  actions: ProviderActionDef[];
  status?: SkillStatus;
  mockData?: (action: string, context: SkillContext) => Record<string, unknown>;
}

export interface ProviderPermissions {
  skillId: string;
  defaultScopes: string[];
  actionScopes: Record<string, string[]>;
}

export interface ProviderPolicies {
  skillId: string;
  constraints: SkillPolicy;
  actionConstraints: Record<string, string[]>;
}

export interface ProviderTelemetryMeta {
  skillId: string;
  provider: string;
  metrics: string[];
  sampleLatencyMs: number;
}

export interface ProviderAuditEvent {
  eventType: string;
  skillId: string;
  provider: string;
  action: string;
  ventureId: string;
  requestedBy: string;
  outcome: "planned" | "executed" | "failed" | "rolled_back";
  sandbox: true;
  timestamp: string;
}

export interface ProviderSandboxConfig {
  skillId: string;
  defaultMode: SandboxMode;
  allowProduction: false;
  networkAccess: false;
  realApiCalls: false;
}

export interface ProviderSkillModule {
  config: ProviderModuleConfig;
  registry: SkillDefinition;
  permissions: ProviderPermissions;
  policies: ProviderPolicies;
  assessActionRisk: (action: string) => RiskLevel;
  buildRollbackPlan: (action: string) => RollbackPlan;
  telemetryMeta: ProviderTelemetryMeta;
  buildAuditEvent: (params: {
    action: string;
    ventureId: string;
    requestedBy: string;
    outcome: ProviderAuditEvent["outcome"];
  }) => ProviderAuditEvent;
  executeMock: (action: string, context: SkillContext) => SkillMockResult;
  sandbox: ProviderSandboxConfig;
  adapter: {
    route: (params: {
      skillId: string;
      ventureId: string;
      executionId: string;
      action: string;
      context: SkillContext;
    }) => SkillMockResult & { runtimeSessionId: string };
  };
}

function defaultMockData(
  config: ProviderModuleConfig,
  action: string,
  context: SkillContext
): Record<string, unknown> {
  return {
    provider: config.provider,
    skillId: config.id,
    action,
    ventureId: context.ventureId,
    sandbox: true,
    timestamp: new Date().toISOString(),
  };
}

export function createProviderModule(config: ProviderModuleConfig): ProviderSkillModule {
  const registry: SkillDefinition = {
    id: config.id,
    name: config.name,
    category: config.category,
    version: "1.0.0",
    provider: config.provider,
    requiredCredentials: [config.credential],
    estimatedCostPerCall: config.category === "cloud" ? 0.01 : 0.002,
    estimatedLatencyMs: config.category === "cloud" ? 800 : 450,
    permissions: [`${config.id}:execute`, ...config.actions.map((a) => `${config.id}:${a.id}`)],
    risks: config.risks,
    capability: config.capability,
    status: config.status ?? "sandbox",
    health: "healthy",
  };

  const permissions: ProviderPermissions = {
    skillId: config.id,
    defaultScopes: [`${config.id}:execute`, `${config.category}:read`],
    actionScopes: Object.fromEntries(
      config.actions.map((a) => [a.id, [`${config.id}:${a.id}`, `${config.category}:${a.risk.toLowerCase()}`]])
    ),
  };

  const policies: ProviderPolicies = {
    skillId: config.id,
    constraints: {
      id: `policy-${config.id}`,
      maxCostPerCall: config.category === "cloud" ? 0.25 : 0.05,
      timeoutMs: 30_000,
      requireApproval: config.risks.includes("infra_change") || config.risks.includes("cloud_cost"),
      allowedDepartments: ["ceo", "cto", "deployment", "infrastructure"],
      sandboxOnly: true,
    },
    actionConstraints: Object.fromEntries(
      config.actions.map((a) => [
        a.id,
        a.risk === "CRITICAL" || a.risk === "HIGH"
          ? ["require-approval", "sandbox-only"]
          : ["sandbox-only"],
      ])
    ),
  };

  const assessActionRisk = (action: string): RiskLevel => {
    const match = config.actions.find((a) => a.id === action);
    return match?.risk ?? "LOW";
  };

  const buildRollbackPlan = (action: string): RollbackPlan => {
    const destructive = /delete|destroy|purge|drop|stop|rollback/i.test(action);
    const deploy = /deploy|publish|release|push|merge/i.test(action);
    return {
      skillId: config.id,
      steps: [
        `Snapshot ${config.name} state before ${action}`,
        `Identify side effects for ${action}`,
        `[SANDBOX] Execute compensating action for ${config.name}`,
        "Verify mock state consistency",
        "Mark audit outcome as rolled_back",
      ],
      recoveryPlan: [
        "Notify requesting department",
        "Escalate to Security on repeated failure",
        "Re-assess risk before retry",
      ],
      compensationActions: destructive
        ? ["Restore from last known good snapshot (mock)"]
        : deploy
          ? ["Revert to previous deployment revision (mock)"]
          : ["No persistent state — rollback is no-op (mock)"],
    };
  };

  const telemetryMeta: ProviderTelemetryMeta = {
    skillId: config.id,
    provider: config.provider,
    metrics: ["latencyMs", "success", "action", "sandboxMode"],
    sampleLatencyMs: registry.estimatedLatencyMs,
  };

  const buildAuditEvent = (params: {
    action: string;
    ventureId: string;
    requestedBy: string;
    outcome: ProviderAuditEvent["outcome"];
  }): ProviderAuditEvent => ({
    eventType: "PROVIDER_SKILL_EXECUTION",
    skillId: config.id,
    provider: config.provider,
    action: params.action,
    ventureId: params.ventureId,
    requestedBy: params.requestedBy,
    outcome: params.outcome,
    sandbox: true,
    timestamp: new Date().toISOString(),
  });

  const sandbox: ProviderSandboxConfig = {
    skillId: config.id,
    defaultMode: "sandbox",
    allowProduction: false,
    networkAccess: false,
    realApiCalls: false,
  };

  const executeMock = (action: string, context: SkillContext): SkillMockResult => {
    const known = config.actions.some((a) => a.id === action);
    const data = config.mockData?.(action, context) ?? defaultMockData(config, action, context);
    return {
      success: true,
      output: `[MOCK/${config.provider}] ${config.name}.${action}${known ? "" : " (generic)"} for venture ${context.ventureId}`,
      data,
      mock: true,
    };
  };

  const adapter = {
    route: (params: {
      skillId: string;
      ventureId: string;
      executionId: string;
      action: string;
      context: SkillContext;
    }) => {
      const runtime = dispatchSkillToRuntime({
        skillId: params.skillId,
        ventureId: params.ventureId,
        executionId: params.executionId,
        action: params.action,
      });
      const result = executeMock(params.action, params.context);
      return { ...result, runtimeSessionId: runtime.runtimeSessionId };
    },
  };

  return {
    config,
    registry,
    permissions,
    policies,
    assessActionRisk,
    buildRollbackPlan,
    telemetryMeta,
    buildAuditEvent,
    executeMock,
    sandbox,
    adapter,
  };
}
