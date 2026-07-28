/** ForgeOS Business Skills — provider module factory (RC4.4). */

import type { MeshDepartmentId } from "@/lib/executive-mesh/types";
import type { SkillContext, SkillDefinition, SkillMockResult, SkillRoutingDecision } from "@/lib/skills/types";
import { dispatchSkillToRuntime } from "@/lib/skills/adapters/runtime-adapter";
import type { RiskLevel } from "@/lib/skills-governance/types";
import type {
  BusinessActionDef,
  BusinessActionRiskMap,
  BusinessAuditShape,
  BusinessPermissionConfig,
  BusinessPolicyConfig,
  BusinessProviderDef,
  BusinessProviderModule,
  BusinessRollbackConfig,
  BusinessSandboxConfig,
  BusinessTelemetryMeta,
} from "../types";

const DEFAULT_DEPARTMENTS: MeshDepartmentId[] = ["ceo", "cfo", "coo", "finance", "legal"];

function riskToLevel(risk: BusinessActionDef["risk"]): RiskLevel {
  switch (risk) {
    case "critical":
      return "CRITICAL";
    case "high":
      return "HIGH";
    case "medium":
      return "MEDIUM";
    default:
      return "LOW";
  }
}

function riskToScore(risk: BusinessActionDef["risk"]): number {
  switch (risk) {
    case "critical":
      return 90;
    case "high":
      return 70;
    case "medium":
      return 45;
    default:
      return 15;
  }
}

export function buildRegistry(def: BusinessProviderDef): SkillDefinition {
  return {
    id: def.skillId,
    name: def.name,
    category: def.category,
    version: "1.0.0",
    provider: def.provider,
    requiredCredentials: [],
    estimatedCostPerCall: def.domain === "payments" ? 0.05 : 0.002,
    estimatedLatencyMs: def.domain === "payments" ? 800 : 350,
    permissions: [`${def.skillId}:execute`, ...def.actions.map((a) => `${def.skillId}:${a.id}`)],
    risks: def.risks,
    capability: def.capability,
    status: def.status ?? "sandbox",
    health: "healthy",
  };
}

export function buildPermissions(def: BusinessProviderDef): BusinessPermissionConfig {
  return {
    skillId: def.skillId,
    scopes: def.actions.map((a) => `${def.skillId}:${a.id}`),
    allowedDepartments: def.allowedDepartments ?? DEFAULT_DEPARTMENTS,
    requireApproval: def.domain === "payments" || def.domain === "contracts",
  };
}

export function buildPolicies(def: BusinessProviderDef): BusinessPolicyConfig {
  const highRisk = def.domain === "payments" || def.domain === "contracts";
  return {
    id: `policy-business-${def.domain}`,
    maxCostPerCall: def.domain === "payments" ? 0.25 : 0.1,
    timeoutMs: highRisk ? 45_000 : 30_000,
    requireApproval: highRisk,
    sandboxOnly: true,
    allowedDepartments: def.allowedDepartments ?? DEFAULT_DEPARTMENTS,
  };
}

export function buildActionRiskMaps(def: BusinessProviderDef): BusinessActionRiskMap[] {
  return def.actions.map((action) => ({
    action: action.id,
    level: riskToLevel(action.risk),
    score: riskToScore(action.risk),
    factors: [`${def.name} action: ${action.label}`, `Domain risk: ${action.risk}`],
  }));
}

export function assessActionRisk(def: BusinessProviderDef, action: string): BusinessActionRiskMap {
  const found = def.actions.find((a) => a.id === action);
  if (!found) {
    return {
      action,
      level: "MEDIUM",
      score: 40,
      factors: [`Unknown action ${action} on ${def.skillId}`],
    };
  }
  return {
    action,
    level: riskToLevel(found.risk),
    score: riskToScore(found.risk),
    factors: [`${def.name}: ${found.label}`, `Action risk: ${found.risk}`],
  };
}

export function buildRollback(def: BusinessProviderDef): BusinessRollbackConfig {
  const compensation =
    def.domain === "payments"
      ? ["Reverse charge via mock refund", "Notify CFO", "Freeze payout queue"]
      : def.domain === "contracts"
        ? ["Void draft contract", "Revoke signature token", "Notify legal"]
        : ["Revert mock state", "Log compensation event"];

  return {
    skillId: def.skillId,
    steps: [
      `Snapshot pre-${def.domain} state`,
      `Mark execution ${def.skillId} as rolled_back`,
      "Apply compensation actions",
      "Notify requesting department",
    ],
    recoveryPlan: [
      `Retry ${def.name} in sandbox mode`,
      "Escalate to CEO if repeated failure",
      "Update audit timeline",
    ],
    compensationActions: compensation,
  };
}

export function buildTelemetry(def: BusinessProviderDef): BusinessTelemetryMeta {
  return {
    skillId: def.skillId,
    provider: def.provider,
    domain: def.domain,
    trackLatency: true,
    trackCost: def.domain === "payments" || def.domain === "billing",
    trackFailures: true,
  };
}

export function buildAuditShape(
  def: BusinessProviderDef,
  params: {
    action: string;
    ventureId: string;
    requestedBy: MeshDepartmentId;
    outcome: BusinessAuditShape["outcome"];
    details: string;
  }
): BusinessAuditShape {
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

export function buildSandbox(def: BusinessProviderDef): BusinessSandboxConfig {
  const mode =
    def.domain === "payments" || def.domain === "contracts"
      ? "sandbox"
      : def.domain === "billing" || def.domain === "accounting"
        ? "dry_run"
        : "simulation";

  return {
    skillId: def.skillId,
    defaultMode: mode,
    allowProduction: false,
    mockDataPrefix: `mock-${def.domain}`,
  };
}

export function buildMockExecutor(def: BusinessProviderDef) {
  return function mockExecute(
    context: SkillContext,
    routing: SkillRoutingDecision
  ): SkillMockResult {
    const actionDef = def.actions.find((a) => a.id === context.action);
    const actionLabel = actionDef?.label ?? context.action;

    const mockData: Record<string, unknown> = {
      skillId: def.skillId,
      domain: def.domain,
      provider: routing.provider,
      action: context.action,
      sandbox: true,
      ventureId: context.ventureId,
      requestedBy: context.requestedBy,
      mockRef: `${def.domain}-${Date.now()}`,
    };

    if (def.domain === "crm") {
      mockData.contacts = [{ id: "c-001", name: "Acme Corp", status: "active" }];
      mockData.pipeline = { stages: ["lead", "qualified", "proposal", "won"], total: 12 };
    } else if (def.domain === "erp") {
      mockData.inventory = { sku: "SKU-100", qty: 42 };
      mockData.orders = [{ id: "ord-9001", status: "fulfilled" }];
    } else if (def.domain === "accounting") {
      mockData.ledgerBalance = 125_400.5;
      mockData.journalEntryId = `je-${Date.now()}`;
    } else if (def.domain === "payments") {
      mockData.transactionId = `txn_mock_${Date.now()}`;
      mockData.amount = context.payload?.amount ?? 99.0;
      mockData.currency = "USD";
    } else if (def.domain === "contracts") {
      mockData.contractId = `ctr-${Date.now()}`;
      mockData.status = context.action === "sign_contract" ? "signed" : "draft";
    } else if (def.domain === "billing") {
      mockData.subscriptionId = `sub-${Date.now()}`;
      mockData.plan = context.payload?.plan ?? "pro";
    } else if (def.domain === "invoices") {
      mockData.invoiceId = `inv-${Date.now()}`;
      mockData.status = context.action === "send_invoice" ? "sent" : "draft";
    } else if (def.domain === "customers") {
      mockData.customerId = "cust-001";
      mockData.segment = context.payload?.segment ?? "enterprise";
    }

    return {
      success: true,
      output: `[MOCK] ${def.name} — ${actionLabel} for venture ${context.ventureId} via ${routing.provider}`,
      data: mockData,
      mock: true,
    };
  };
}

export function buildAdapter(def: BusinessProviderDef, mockExecute: ReturnType<typeof buildMockExecutor>) {
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
    return { runtime, mock };
  };
}

export function createProviderModule(def: BusinessProviderDef): BusinessProviderModule {
  return {
    def,
    registry: buildRegistry(def),
    permissions: buildPermissions(def),
    policies: buildPolicies(def),
    telemetry: buildTelemetry(def),
  };
}
