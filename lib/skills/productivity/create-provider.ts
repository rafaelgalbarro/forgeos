/** ForgeOS Productivity Skills — provider module factory (RC4.3). */

import { dispatchSkillToRuntime } from "@/lib/skills/adapters/runtime-adapter";
import type { SkillContext, SkillDefinition, SkillMockResult, SkillRoutingDecision } from "@/lib/skills/types";
import type { RiskLevel, SandboxMode } from "@/lib/skills-governance/types";
import type {
  ProductivityAuditShape,
  ProductivityProviderConfig,
  ProductivityProviderModule,
  ProductivityRiskAssessment,
  ProductivityRollbackPlan,
  ProductivitySandboxConfig,
  ProductivitySkillMetadata,
  ProductivitySkillPolicy,
  ProductivityTelemetryMeta,
} from "./types";

const ACTION_RISK_SCORE: Record<string, number> = { low: 15, medium: 40, high: 65 };

function actionRiskLevel(score: number): RiskLevel {
  if (score >= 65) return "HIGH";
  if (score >= 35) return "MEDIUM";
  return "LOW";
}

function actionSandboxMode(level: RiskLevel): SandboxMode {
  if (level === "HIGH") return "sandbox";
  if (level === "MEDIUM") return "dry_run";
  return "simulation";
}

export function createProductivityMetadata(config: ProductivityProviderConfig): ProductivitySkillMetadata {
  const telemetry: ProductivityTelemetryMeta = {
    provider: config.provider,
    trackLatency: true,
    trackCost: true,
    sampleRate: 1,
  };
  const auditShape: ProductivityAuditShape = {
    fields: ["skillId", "action", "ventureId", "requestedBy", "outcome", "sandboxMode"],
    retentionDays: 90,
    includePayload: false,
  };
  return {
    id: config.id,
    name: config.name,
    provider: config.provider,
    category: "productivity",
    actions: config.actions,
    risks: config.risks,
    status: "sandbox",
    permissions: config.permissions,
    telemetry,
    auditShape,
  };
}

export function createProductivityDefinition(
  config: ProductivityProviderConfig,
  metadata: ProductivitySkillMetadata
): SkillDefinition {
  return {
    id: config.id,
    name: config.name,
    category: "productivity",
    version: "1.0.0",
    provider: config.provider,
    requiredCredentials: [],
    estimatedCostPerCall: 0.001,
    estimatedLatencyMs: 350,
    permissions: config.permissions,
    risks: config.risks,
    capability: config.capability,
    status: "sandbox",
    health: "healthy",
  };
}

export function createProductivityPermissions(config: ProductivityProviderConfig): string[] {
  return [...config.permissions, `productivity:${config.provider}:*`];
}

export function createProductivityPolicy(config: ProductivityProviderConfig): ProductivitySkillPolicy {
  return {
    id: `policy-productivity-${config.provider}`,
    maxCostPerCall: 0.05,
    timeoutMs: 15_000,
    requireApproval: false,
    sandboxOnly: true,
    allowedActions: config.actions.map((a) => a.id),
  };
}

export function createProductivityRiskAssessor(config: ProductivityProviderConfig) {
  return (action: string): ProductivityRiskAssessment => {
    const matched = config.actions.find((a) => a.id === action);
    const baseScore = matched ? ACTION_RISK_SCORE[matched.risk] : 25;
    const factors = [`Productivity ${config.provider} action: ${action}`];
    if (config.risks.includes("external_communication")) factors.push("External communication");
    if (config.risks.includes("data_exposure")) factors.push("Potential data exposure");
    const level = actionRiskLevel(baseScore);
    return { level, score: baseScore, factors, sandboxMode: actionSandboxMode(level) };
  };
}

export function createProductivityRollbackBuilder(config: ProductivityProviderConfig) {
  return (action: string): ProductivityRollbackPlan => ({
    skillId: config.id,
    steps: [
      `Snapshot ${config.name} state before ${action}`,
      `Identify side effects of ${action}`,
      "Execute compensating transaction (sandbox mock)",
      "Verify mock state consistency",
      "Mark execution as rolled_back in audit log",
    ],
    recoveryPlan: [
      "Notify requesting department of rollback",
      "Update venture timeline with rollback event",
      "Re-evaluate risk before retry",
    ],
    compensationActions: [/send|share|publish/i.test(action)
      ? "Recall or mark sent item as retracted (mock)"
      : "No state changes to compensate (read-only action)"],
  });
}

export function createProductivitySandbox(): ProductivitySandboxConfig {
  return {
    mode: "simulation",
    mockDataEnabled: true,
    productionDefault: false,
    credentialCheck: false,
  };
}

export function createProductivityMockExecutor(config: ProductivityProviderConfig) {
  return (context: SkillContext, routing: SkillRoutingDecision): SkillMockResult => {
    const actionDef = config.actions.find((a) => a.id === context.action);
    const actionLabel = actionDef?.name ?? context.action;
    return {
      success: true,
      output: `[MOCK][${config.name}] ${actionLabel} for venture ${context.ventureId} via ${routing.provider} (sandbox)`,
      data: {
        skillId: config.id,
        provider: config.provider,
        action: context.action,
        sandbox: true,
        requestedBy: context.requestedBy,
        mockData: config.mockData ?? {},
      },
      mock: true,
    };
  };
}

export function createProductivityAdapter(
  config: ProductivityProviderConfig,
  executeMock: (context: SkillContext, routing: SkillRoutingDecision) => SkillMockResult
) {
  return (
    context: SkillContext,
    routing: SkillRoutingDecision,
    executionId: string
  ) => {
    const runtime = dispatchSkillToRuntime({
      skillId: config.id,
      ventureId: context.ventureId,
      executionId,
      action: context.action,
    });
    const mock = executeMock(context, routing);
    return { runtimeSessionId: runtime.runtimeSessionId, mock };
  };
}

export function createProductivityProvider(config: ProductivityProviderConfig): ProductivityProviderModule {
  const metadata = createProductivityMetadata(config);
  const definition = createProductivityDefinition(config, metadata);
  const permissions = createProductivityPermissions(config);
  const policy = createProductivityPolicy(config);
  const assessRisk = createProductivityRiskAssessor(config);
  const buildRollback = createProductivityRollbackBuilder(config);
  const sandbox = createProductivitySandbox();
  const executeMock = createProductivityMockExecutor(config);
  const executeViaAdapter = createProductivityAdapter(config, executeMock);

  return {
    metadata,
    definition,
    permissions,
    policy,
    assessRisk,
    buildRollback,
    executeMock,
    sandbox,
    executeViaAdapter,
  };
}
