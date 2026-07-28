/** ForgeOS Analytics Skills Lab — RC4.6. */

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
  ANALYTICS_PROVIDER_MODULES,
  ANALYTICS_SKILL_IDS,
  ANALYTICS_SKILL_REGISTRY,
} from "@/lib/skills/analytics/registry";
import type { AnalyticsActionDef } from "@/lib/skills/analytics/types";
import type { SkillDefinition } from "@/lib/skills/types";

export interface AnalyticsDomainSection {
  domain: string;
  skill: SkillDefinition;
  actions: AnalyticsActionDef[];
  riskSample: { action: string; level: string; score: number };
}

export interface AnalyticsSkillsLabSnapshot {
  registry: typeof ANALYTICS_SKILL_REGISTRY;
  domains: AnalyticsDomainSection[];
  health: { total: number; healthy: number; sandbox: number };
  auditLogs: ReturnType<typeof getSkillAuditLogs>;
  telemetry: ReturnType<typeof getSkillTelemetry>;
  history: ReturnType<typeof getSkillHistory>;
  governanceHistory: ReturnType<typeof getGovernanceHistory>;
  sampleExecutions: Record<string, GovernanceResult | null>;
}

const SAMPLE_ACTIONS: Record<string, string> = {
  "analytics-dashboards": "create",
  "analytics-reports": "generate",
  "analytics-kpis": "track",
  "analytics-forecast": "scenarios",
  "analytics-predictions": "trends",
  "analytics-metrics": "query",
};

async function runSample(skillId: string, action: string, ventureId: string) {
  try {
    return await runGovernedSkillRequest({
      skillId,
      context: {
        ventureId,
        requestedBy: "cpo",
        approvedBy: "ceo",
        action,
        payload: { sandbox: true },
      },
    });
  } catch {
    return null;
  }
}

export async function runAnalyticsSkillsLab(
  ventureId = "demo-venture-vandl"
): Promise<AnalyticsSkillsLabSnapshot> {
  const domains: AnalyticsDomainSection[] = ANALYTICS_PROVIDER_MODULES.map((mod) => {
    const skill = mod.registry;
    const actions = mod.def.actions;
    const sampleAction = SAMPLE_ACTIONS[skill.id] ?? actions[0]?.id ?? "query";
    const risk = assessSkillRisk(skill.id, sampleAction);
    return {
      domain: mod.def.domain,
      skill,
      actions,
      riskSample: { action: sampleAction, level: risk.level, score: risk.score },
    };
  });

  const sampleExecutions: Record<string, GovernanceResult | null> = {};
  for (const skillId of ANALYTICS_SKILL_IDS) {
    const action = SAMPLE_ACTIONS[skillId] ?? "query";
    sampleExecutions[skillId] = await runSample(skillId, action, ventureId);
  }

  const healthy = ANALYTICS_SKILL_REGISTRY.filter((s) => s.health === "healthy").length;
  const sandbox = ANALYTICS_SKILL_REGISTRY.filter((s) => s.status === "sandbox").length;

  return {
    registry: ANALYTICS_SKILL_REGISTRY,
    domains,
    health: { total: ANALYTICS_SKILL_REGISTRY.length, healthy, sandbox },
    auditLogs: getSkillAuditLogs(ventureId).filter((l) => ANALYTICS_SKILL_IDS.has(l.skillId)),
    telemetry: getSkillTelemetry().filter((t) => ANALYTICS_SKILL_IDS.has(t.skillId)),
    history: getSkillHistory(ventureId).filter((h) => ANALYTICS_SKILL_IDS.has(h.skillId)),
    governanceHistory: getGovernanceHistory(ventureId).filter((h) =>
      ANALYTICS_SKILL_IDS.has(h.skillId)
    ),
    sampleExecutions,
  };
}
