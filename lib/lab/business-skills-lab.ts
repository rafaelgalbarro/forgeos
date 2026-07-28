/** ForgeOS Business Skills Lab — RC4.4. */

import {
  getSkillAuditLogs,
  getSkillTelemetry,
  getSkillHistory,
} from "@/lib/skills";
import { runGovernedSkillRequest } from "@/lib/skills-governance/pipeline";
import { assessSkillRisk } from "@/lib/skills-governance/risk-engine";
import { getGovernanceHistory } from "@/lib/skills-governance/governance-history";
import type { GovernanceResult } from "@/lib/skills-governance/types";
import {
  BUSINESS_SKILL_REGISTRY,
  BUSINESS_SKILL_IDS,
} from "@/lib/skills/business/registry";
import { CRM_ACTIONS } from "@/lib/skills/business/crm/registry";
import { ERP_ACTIONS } from "@/lib/skills/business/erp/registry";
import { ACCOUNTING_ACTIONS } from "@/lib/skills/business/accounting/registry";
import { PAYMENTS_ACTIONS } from "@/lib/skills/business/payments/registry";
import { CONTRACTS_ACTIONS } from "@/lib/skills/business/contracts/registry";
import { BILLING_ACTIONS } from "@/lib/skills/business/billing/registry";
import { INVOICES_ACTIONS } from "@/lib/skills/business/invoices/registry";
import { CUSTOMERS_ACTIONS } from "@/lib/skills/business/customers/registry";
import type { BusinessActionDef } from "@/lib/skills/business/types";
import type { SkillDefinition } from "@/lib/skills/types";

export interface BusinessDomainSection {
  domain: string;
  skill: SkillDefinition;
  actions: BusinessActionDef[];
  riskSample: { action: string; level: string; score: number };
}

export interface BusinessSkillsLabSnapshot {
  registry: typeof BUSINESS_SKILL_REGISTRY;
  domains: BusinessDomainSection[];
  health: { total: number; healthy: number; sandbox: number };
  auditLogs: ReturnType<typeof getSkillAuditLogs>;
  telemetry: ReturnType<typeof getSkillTelemetry>;
  history: ReturnType<typeof getSkillHistory>;
  governanceHistory: ReturnType<typeof getGovernanceHistory>;
  sampleExecutions: Record<string, GovernanceResult | null>;
}

const DOMAIN_ACTIONS: Record<string, BusinessActionDef[]> = {
  "business-crm": CRM_ACTIONS,
  "business-erp": ERP_ACTIONS,
  "business-accounting": ACCOUNTING_ACTIONS,
  "business-payments": PAYMENTS_ACTIONS,
  "business-contracts": CONTRACTS_ACTIONS,
  "business-billing": BILLING_ACTIONS,
  "business-invoices": INVOICES_ACTIONS,
  "business-customers": CUSTOMERS_ACTIONS,
};

const SAMPLE_ACTIONS: Record<string, string> = {
  "business-crm": "get_pipeline",
  "business-erp": "check_inventory",
  "business-accounting": "get_ledger",
  "business-payments": "get_balance",
  "business-contracts": "review_contract",
  "business-billing": "track_usage",
  "business-invoices": "track_invoice",
  "business-customers": "list_customers",
};

async function runSample(skillId: string, action: string, ventureId: string) {
  try {
    return await runGovernedSkillRequest({
      skillId,
      context: {
        ventureId,
        requestedBy: "cfo",
        approvedBy: "ceo",
        action,
        payload: { sandbox: true },
      },
    });
  } catch {
    return null;
  }
}

export async function runBusinessSkillsLab(
  ventureId = "demo-venture-vandl"
): Promise<BusinessSkillsLabSnapshot> {
  const domains: BusinessDomainSection[] = BUSINESS_SKILL_REGISTRY.map((skill) => {
    const actions = DOMAIN_ACTIONS[skill.id] ?? [];
    const sampleAction = SAMPLE_ACTIONS[skill.id] ?? actions[0]?.id ?? "list";
    const risk = assessSkillRisk(skill.id, sampleAction);
    return {
      domain: skill.id.replace("business-", ""),
      skill,
      actions,
      riskSample: { action: sampleAction, level: risk.level, score: risk.score },
    };
  });

  const sampleExecutions: Record<string, GovernanceResult | null> = {};
  for (const skillId of BUSINESS_SKILL_IDS) {
    const action = SAMPLE_ACTIONS[skillId] ?? "list";
    sampleExecutions[skillId] = await runSample(skillId, action, ventureId);
  }

  const healthy = BUSINESS_SKILL_REGISTRY.filter((s) => s.health === "healthy").length;
  const sandbox = BUSINESS_SKILL_REGISTRY.filter((s) => s.status === "sandbox").length;

  return {
    registry: BUSINESS_SKILL_REGISTRY,
    domains,
    health: { total: BUSINESS_SKILL_REGISTRY.length, healthy, sandbox },
    auditLogs: getSkillAuditLogs(ventureId).filter((l) => BUSINESS_SKILL_IDS.includes(l.skillId)),
    telemetry: getSkillTelemetry().filter((t) => BUSINESS_SKILL_IDS.includes(t.skillId)),
    history: getSkillHistory(ventureId).filter((h) => BUSINESS_SKILL_IDS.includes(h.skillId)),
    governanceHistory: getGovernanceHistory(ventureId).filter((h) =>
      BUSINESS_SKILL_IDS.includes(h.skillId)
    ),
    sampleExecutions,
  };
}
