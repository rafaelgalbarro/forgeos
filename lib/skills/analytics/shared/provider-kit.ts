/** ForgeOS Analytics Skills — provider module kit (RC4.6). */

import type { MeshDepartmentId } from "@/lib/executive-mesh/types";
import { dispatchSkillToRuntime } from "@/lib/skills/adapters/runtime-adapter";
import type { SkillContext, SkillDefinition, SkillMockResult, SkillRoutingDecision } from "@/lib/skills/types";
import type { RiskLevel, RollbackPlan } from "@/lib/skills-governance/types";
import type {
  AnalyticsActionDef,
  AnalyticsActionRiskMap,
  AnalyticsAuditShape,
  AnalyticsPermissionConfig,
  AnalyticsPolicyConfig,
  AnalyticsProviderDef,
  AnalyticsProviderModule,
  AnalyticsSandboxConfig,
  AnalyticsTelemetryMeta,
} from "../types";

const DEFAULT_DEPARTMENTS: MeshDepartmentId[] = ["ceo", "cpo", "coo", "growth", "cto"];

function riskToLevel(risk: AnalyticsActionDef["risk"]): RiskLevel {
  switch (risk) {
    case "high":
      return "HIGH";
    case "medium":
      return "MEDIUM";
    default:
      return "LOW";
  }
}

function riskToScore(risk: AnalyticsActionDef["risk"]): number {
  switch (risk) {
    case "high":
      return 65;
    case "medium":
      return 40;
    default:
      return 15;
  }
}

export function buildRegistry(def: AnalyticsProviderDef): SkillDefinition {
  return {
    id: def.skillId,
    name: def.name,
    category: def.category,
    version: "1.0.0",
    provider: def.provider,
    requiredCredentials: [],
    estimatedCostPerCall: def.domain === "forecast" || def.domain === "predictions" ? 0.02 : 0.003,
    estimatedLatencyMs: def.domain === "predictions" ? 1200 : 400,
    permissions: [`${def.skillId}:execute`, ...def.actions.map((a) => `${def.skillId}:${a.id}`)],
    risks: def.risks,
    capability: def.capability,
    status: def.status ?? "sandbox",
    health: "healthy",
  };
}

export function buildPermissions(def: AnalyticsProviderDef): AnalyticsPermissionConfig {
  return {
    skillId: def.skillId,
    scopes: def.actions.map((a) => `${def.skillId}:${a.id}`),
    allowedDepartments: def.allowedDepartments ?? DEFAULT_DEPARTMENTS,
    requireApproval: def.domain === "predictions" || def.domain === "forecast",
  };
}

export function buildPolicies(def: AnalyticsProviderDef): AnalyticsPolicyConfig {
  const mlDomain = def.domain === "predictions" || def.domain === "forecast";
  return {
    id: `policy-analytics-${def.domain}`,
    maxCostPerCall: mlDomain ? 0.15 : 0.08,
    timeoutMs: mlDomain ? 45_000 : 30_000,
    requireApproval: mlDomain,
    sandboxOnly: true,
    allowedDepartments: def.allowedDepartments ?? DEFAULT_DEPARTMENTS,
  };
}

export function assessActionRisk(def: AnalyticsProviderDef, action: string): AnalyticsActionRiskMap {
  const found = def.actions.find((a) => a.id === action);
  if (!found) {
    return {
      action,
      level: "MEDIUM",
      score: 35,
      factors: [`Unknown analytics action ${action} on ${def.skillId}`],
    };
  }
  return {
    action,
    level: riskToLevel(found.risk),
    score: riskToScore(found.risk),
    factors: [`${def.name}: ${found.label}`, `Action risk: ${found.risk}`],
  };
}

export function buildRollback(def: AnalyticsProviderDef): RollbackPlan {
  return {
    skillId: def.skillId,
    steps: [
      `Snapshot ${def.domain} analytics state`,
      `Revert mock changes from ${def.skillId}`,
      "Notify requesting department",
      "Mark audit outcome as rolled_back",
    ],
    recoveryPlan: [
      `Retry ${def.name} in sandbox mode`,
      "Re-validate data pipeline mock state",
      "Escalate to CPO on repeated failure",
    ],
    compensationActions:
      def.domain === "reports" || def.domain === "dashboards"
        ? ["Unpublish mock artifact", "Revoke share tokens (mock)"]
        : ["No persistent state — rollback is no-op (mock)"],
  };
}

export function buildTelemetry(def: AnalyticsProviderDef): AnalyticsTelemetryMeta {
  return {
    skillId: def.skillId,
    provider: def.provider,
    domain: def.domain,
    metrics: ["latencyMs", "success", "action", "sandboxMode", "dataPoints"],
    trackLatency: true,
    trackCost: def.domain === "forecast" || def.domain === "predictions",
  };
}

export function buildAuditShape(
  def: AnalyticsProviderDef,
  params: {
    action: string;
    ventureId: string;
    requestedBy: MeshDepartmentId;
    outcome: AnalyticsAuditShape["outcome"];
    details: string;
  }
): AnalyticsAuditShape {
  return {
    skillId: def.skillId,
    domain: def.domain,
    action: params.action,
    ventureId: params.ventureId,
    requestedBy: params.requestedBy,
    outcome: params.outcome,
    sandbox: true,
    details: params.details,
  };
}

export function buildSandbox(def: AnalyticsProviderDef): AnalyticsSandboxConfig {
  const mode =
    def.domain === "predictions" || def.domain === "forecast"
      ? "sandbox"
      : def.domain === "reports" || def.domain === "dashboards"
        ? "dry_run"
        : "simulation";

  return {
    skillId: def.skillId,
    defaultMode: mode,
    allowProduction: false,
    mockDataPrefix: `mock-analytics-${def.domain}`,
    networkAccess: false,
    realApiCalls: false,
  };
}

export function buildDomainMockData(
  def: AnalyticsProviderDef,
  context: SkillContext
): Record<string, unknown> {
  const base: Record<string, unknown> = {
    skillId: def.skillId,
    domain: def.domain,
    action: context.action,
    ventureId: context.ventureId,
    sandbox: true,
    mockRef: `${def.domain}-${Date.now()}`,
  };

  switch (def.domain) {
    case "dashboards":
      return {
        ...base,
        dashboardId: `dash-${Date.now()}`,
        widgets: 6,
        sharedWith: context.payload?.sharedWith ?? ["ceo", "cpo"],
        refreshedAt: new Date().toISOString(),
      };
    case "reports":
      return {
        ...base,
        reportId: `rpt-${Date.now()}`,
        format: context.payload?.format ?? "pdf",
        schedule: context.action === "schedule" ? "weekly" : undefined,
        recipients: 3,
      };
    case "kpis":
      return {
        ...base,
        kpiId: `kpi-${Date.now()}`,
        value: 87.5,
        target: 90,
        status: context.action === "alert" ? "below_threshold" : "on_track",
      };
    case "forecast":
      return {
        ...base,
        modelId: `fc-model-${Date.now()}`,
        scenario: context.payload?.scenario ?? "baseline",
        horizonDays: 90,
        confidence: 0.82,
      };
    case "predictions":
      return {
        ...base,
        insightType: context.action,
        confidence: 0.91,
        anomalyScore: context.action === "anomalies" ? 0.73 : undefined,
        trendDirection: context.action === "trends" ? "up" : undefined,
      };
    case "metrics":
      return {
        ...base,
        metricName: context.payload?.metric ?? "active_users",
        aggregation: context.action === "aggregate" ? "daily" : "raw",
        dataPoints: 128,
        visualization: context.action === "visualize" ? "line_chart" : undefined,
      };
    default:
      return base;
  }
}

export function buildMockExecutor(def: AnalyticsProviderDef) {
  return function mockExecute(
    context: SkillContext,
    routing: SkillRoutingDecision
  ): SkillMockResult {
    const actionDef = def.actions.find((a) => a.id === context.action);
    const actionLabel = actionDef?.label ?? context.action;
    const mockData = buildDomainMockData(def, context);

    return {
      success: true,
      output: `[MOCK][Analytics/${def.domain}] ${def.name} — ${actionLabel} for venture ${context.ventureId} via ${routing.provider}`,
      data: mockData,
      mock: true,
    };
  };
}

export function buildAdapter(def: AnalyticsProviderDef, mockExecute: ReturnType<typeof buildMockExecutor>) {
  return function executeViaRuntime(params: {
    ventureId: string;
    executionId: string;
    action: string;
    context: SkillContext;
    routing: SkillRoutingDecision;
  }) {
    const runtime = dispatchSkillToRuntime({
      skillId: def.skillId,
      ventureId: params.ventureId,
      executionId: params.executionId,
      action: params.action,
    });
    const mock = mockExecute(params.context, params.routing);
    return { runtimeSessionId: runtime.runtimeSessionId, ...mock };
  };
}

export function createAnalyticsProviderModule(def: AnalyticsProviderDef): AnalyticsProviderModule {
  return {
    def,
    registry: buildRegistry(def),
    permissions: buildPermissions(def),
    policies: buildPolicies(def),
    telemetry: buildTelemetry(def),
    assessActionRisk: (action) => assessActionRisk(def, action),
    buildRollback: () => buildRollback(def),
    buildAuditShape: (params) => buildAuditShape(def, params),
    sandbox: buildSandbox(def),
  };
}
