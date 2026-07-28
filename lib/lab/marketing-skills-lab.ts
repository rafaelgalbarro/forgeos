/** ForgeOS Marketing Skills Lab — RC4.5. */

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
  MARKETING_SKILL_REGISTRY,
  MARKETING_SKILL_IDS,
} from "@/lib/skills/marketing/registry";
import { CAMPAIGNS_ACTIONS } from "@/lib/skills/marketing/campaigns/registry";
import { SEO_ACTIONS } from "@/lib/skills/marketing/seo/registry";
import { ANALYTICS_ACTIONS } from "@/lib/skills/marketing/analytics/registry";
import { ADS_ACTIONS } from "@/lib/skills/marketing/ads/registry";
import { SOCIAL_ACTIONS } from "@/lib/skills/marketing/social/registry";
import { CONTENT_ACTIONS } from "@/lib/skills/marketing/content/registry";
import { EMAIL_ACTIONS } from "@/lib/skills/marketing/email/registry";
import { AUTOMATION_ACTIONS } from "@/lib/skills/marketing/automation/registry";
import type { MarketingSkillAction } from "@/lib/skills/marketing/types";
import type { SkillDefinition } from "@/lib/skills/types";

export interface MarketingDomainSection {
  domain: string;
  skill: SkillDefinition;
  actions: MarketingSkillAction[];
  riskSample: { action: string; level: string; score: number };
}

export interface MarketingSkillsLabSnapshot {
  registry: typeof MARKETING_SKILL_REGISTRY;
  domains: MarketingDomainSection[];
  health: { total: number; healthy: number; sandbox: number };
  auditLogs: ReturnType<typeof getSkillAuditLogs>;
  telemetry: ReturnType<typeof getSkillTelemetry>;
  history: ReturnType<typeof getSkillHistory>;
  governanceHistory: ReturnType<typeof getGovernanceHistory>;
  sampleExecutions: Record<string, GovernanceResult | null>;
}

const DOMAIN_ACTIONS: Record<string, MarketingSkillAction[]> = {
  "marketing-campaigns": CAMPAIGNS_ACTIONS,
  "marketing-seo": SEO_ACTIONS,
  "marketing-analytics": ANALYTICS_ACTIONS,
  "marketing-ads": ADS_ACTIONS,
  "marketing-social": SOCIAL_ACTIONS,
  "marketing-content": CONTENT_ACTIONS,
  "marketing-email": EMAIL_ACTIONS,
  "marketing-automation": AUTOMATION_ACTIONS,
};

const SAMPLE_ACTIONS: Record<string, string> = {
  "marketing-campaigns": "analyze",
  "marketing-seo": "audit",
  "marketing-analytics": "report",
  "marketing-ads": "performance",
  "marketing-social": "monitor",
  "marketing-content": "calendar",
  "marketing-email": "ab_test",
  "marketing-automation": "workflow",
};

async function runSample(skillId: string, action: string, ventureId: string) {
  try {
    return await runGovernedSkillRequest({
      skillId,
      context: {
        ventureId,
        requestedBy: "cmo",
        approvedBy: "ceo",
        action,
        payload: { sandbox: true },
      },
    });
  } catch {
    return null;
  }
}

export async function runMarketingSkillsLab(
  ventureId = "demo-venture-vandl"
): Promise<MarketingSkillsLabSnapshot> {
  const domains: MarketingDomainSection[] = MARKETING_SKILL_REGISTRY.map((skill) => {
    const actions = DOMAIN_ACTIONS[skill.id] ?? [];
    const sampleAction = SAMPLE_ACTIONS[skill.id] ?? actions[0]?.id ?? "list";
    const risk = assessSkillRisk(skill.id, sampleAction);
    return {
      domain: skill.id.replace("marketing-", ""),
      skill,
      actions,
      riskSample: { action: sampleAction, level: risk.level, score: risk.score },
    };
  });

  const sampleExecutions: Record<string, GovernanceResult | null> = {};
  for (const skillId of MARKETING_SKILL_IDS) {
    const action = SAMPLE_ACTIONS[skillId] ?? "list";
    sampleExecutions[skillId] = await runSample(skillId, action, ventureId);
  }

  const healthy = MARKETING_SKILL_REGISTRY.filter((s) => s.health === "healthy").length;
  const sandbox = MARKETING_SKILL_REGISTRY.filter((s) => s.status === "sandbox").length;

  return {
    registry: MARKETING_SKILL_REGISTRY,
    domains,
    health: { total: MARKETING_SKILL_REGISTRY.length, healthy, sandbox },
    auditLogs: getSkillAuditLogs(ventureId).filter((l) => MARKETING_SKILL_IDS.has(l.skillId)),
    telemetry: getSkillTelemetry().filter((t) => MARKETING_SKILL_IDS.has(t.skillId)),
    history: getSkillHistory(ventureId).filter((h) => MARKETING_SKILL_IDS.has(h.skillId)),
    governanceHistory: getGovernanceHistory(ventureId).filter((h) =>
      MARKETING_SKILL_IDS.has(h.skillId)
    ),
    sampleExecutions,
  };
}
