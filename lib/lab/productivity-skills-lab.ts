/** ForgeOS Productivity Skills Lab — RC4.3. */

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
  PRODUCTIVITY_SKILL_DEFINITIONS,
  PRODUCTIVITY_SKILL_IDS,
} from "@/lib/skills/productivity/registry";
import { EMAIL_ACTIONS } from "@/lib/skills/productivity/email/registry";
import { CALENDAR_ACTIONS } from "@/lib/skills/productivity/calendar/registry";
import { FILES_ACTIONS } from "@/lib/skills/productivity/files/registry";
import { DOCUMENTS_ACTIONS } from "@/lib/skills/productivity/documents/registry";
import { MESSAGING_ACTIONS } from "@/lib/skills/productivity/messaging/registry";
import { MEETINGS_ACTIONS } from "@/lib/skills/productivity/meetings/registry";
import { KNOWLEDGE_ACTIONS } from "@/lib/skills/productivity/knowledge/registry";
import type { ProductivityAction } from "@/lib/skills/productivity/types";
import type { SkillDefinition } from "@/lib/skills/types";

export interface ProductivitySection {
  key: string;
  label: string;
  skill: SkillDefinition;
  actions: ProductivityAction[];
  riskSample: { action: string; level: string; score: number };
}

export interface ProductivitySkillsLabSnapshot {
  registry: typeof PRODUCTIVITY_SKILL_DEFINITIONS;
  sections: ProductivitySection[];
  health: { total: number; healthy: number; sandbox: number };
  auditLogs: ReturnType<typeof getSkillAuditLogs>;
  telemetry: ReturnType<typeof getSkillTelemetry>;
  history: ReturnType<typeof getSkillHistory>;
  governanceHistory: ReturnType<typeof getGovernanceHistory>;
  sampleExecutions: Record<string, GovernanceResult | null>;
}

const SECTION_META: Record<string, { key: string; label: string }> = {
  "productivity-email": { key: "inbox", label: "Inbox" },
  "productivity-calendar": { key: "calendar", label: "Calendar" },
  "productivity-files": { key: "files", label: "Files" },
  "productivity-documents": { key: "documents", label: "Documents" },
  "productivity-messaging": { key: "slack", label: "Slack" },
  "productivity-meetings": { key: "meetings", label: "Meetings" },
  "productivity-knowledge": { key: "knowledge", label: "Knowledge" },
};

const DOMAIN_ACTIONS: Record<string, ProductivityAction[]> = {
  "productivity-email": EMAIL_ACTIONS,
  "productivity-calendar": CALENDAR_ACTIONS,
  "productivity-files": FILES_ACTIONS,
  "productivity-documents": DOCUMENTS_ACTIONS,
  "productivity-messaging": MESSAGING_ACTIONS,
  "productivity-meetings": MEETINGS_ACTIONS,
  "productivity-knowledge": KNOWLEDGE_ACTIONS,
};

const SAMPLE_ACTIONS: Record<string, string> = {
  "productivity-email": "read",
  "productivity-calendar": "list_events",
  "productivity-files": "list",
  "productivity-documents": "create",
  "productivity-messaging": "list_channels",
  "productivity-meetings": "create",
  "productivity-knowledge": "search",
};

async function runSample(skillId: string, action: string, ventureId: string) {
  try {
    return await runGovernedSkillRequest({
      skillId,
      context: {
        ventureId,
        requestedBy: "coo",
        approvedBy: "ceo",
        action,
        payload: { sandbox: true },
      },
    });
  } catch {
    return null;
  }
}

export async function runProductivitySkillsLab(
  ventureId = "demo-venture-vandl"
): Promise<ProductivitySkillsLabSnapshot> {
  const sections: ProductivitySection[] = PRODUCTIVITY_SKILL_DEFINITIONS.map((skill) => {
    const meta = SECTION_META[skill.id] ?? { key: skill.provider, label: skill.name };
    const actions = DOMAIN_ACTIONS[skill.id] ?? [];
    const sampleAction = SAMPLE_ACTIONS[skill.id] ?? actions[0]?.id ?? "list";
    const risk = assessSkillRisk(skill.id, sampleAction);
    return {
      key: meta.key,
      label: meta.label,
      skill,
      actions,
      riskSample: { action: sampleAction, level: risk.level, score: risk.score },
    };
  });

  const sampleExecutions: Record<string, GovernanceResult | null> = {};
  for (const skillId of [...PRODUCTIVITY_SKILL_IDS]) {
    const action = SAMPLE_ACTIONS[skillId] ?? "list";
    sampleExecutions[skillId] = await runSample(skillId, action, ventureId);
  }

  const healthy = PRODUCTIVITY_SKILL_DEFINITIONS.filter((s) => s.health === "healthy").length;
  const sandbox = PRODUCTIVITY_SKILL_DEFINITIONS.filter((s) => s.status === "sandbox").length;
  const productivityIds = [...PRODUCTIVITY_SKILL_IDS];

  return {
    registry: PRODUCTIVITY_SKILL_DEFINITIONS,
    sections,
    health: { total: PRODUCTIVITY_SKILL_DEFINITIONS.length, healthy, sandbox },
    auditLogs: getSkillAuditLogs(ventureId).filter((l) => productivityIds.includes(l.skillId)),
    telemetry: getSkillTelemetry().filter((t) => productivityIds.includes(t.skillId)),
    history: getSkillHistory(ventureId).filter((h) => productivityIds.includes(h.skillId)),
    governanceHistory: getGovernanceHistory(ventureId).filter((h) =>
      productivityIds.includes(h.skillId)
    ),
    sampleExecutions,
  };
}
