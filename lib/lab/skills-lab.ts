/** ForgeOS Skills Lab — RC4. */

import {
  listAllSkills,
  getSkillHealthSummary,
  getSkillAuditLogs,
  getSkillTelemetry,
  getSkillHistory,
  runSkillRequest,
} from "@/lib/skills";
import type { SkillResult } from "@/lib/skills/types";

export interface SkillsLabSnapshot {
  registry: ReturnType<typeof listAllSkills>;
  health: ReturnType<typeof getSkillHealthSummary>;
  categories: Record<string, number>;
  auditLogs: ReturnType<typeof getSkillAuditLogs>;
  telemetry: ReturnType<typeof getSkillTelemetry>;
  history: ReturnType<typeof getSkillHistory>;
  sampleExecution: SkillResult | null;
}

export async function runSkillsLab(ventureId = "demo-venture-vandl"): Promise<SkillsLabSnapshot> {
  const registry = listAllSkills();
  const categories: Record<string, number> = {};
  for (const s of registry) {
    categories[s.category] = (categories[s.category] ?? 0) + 1;
  }

  let sampleExecution: SkillResult | null = null;
  try {
    sampleExecution = await runSkillRequest({
      skillId: "github",
      context: {
        ventureId,
        requestedBy: "cto",
        approvedBy: "ceo",
        action: "repository_status",
      },
    });
  } catch {
    sampleExecution = null;
  }

  return {
    registry,
    health: getSkillHealthSummary(),
    categories,
    auditLogs: getSkillAuditLogs(ventureId),
    telemetry: getSkillTelemetry(),
    history: getSkillHistory(ventureId),
    sampleExecution,
  };
}
