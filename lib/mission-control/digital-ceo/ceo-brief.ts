/** CEO strategic perspective brief. */

import type { Mission } from "../types";
import type { CEOBrief } from "./types";
import { getPendingDecisions } from "../decision-center";
import { missionToContext } from "../pair-founder/pair-founder-engine";
import { readVentureMemory } from "../pair-founder/venture-memory";
import { detectRisks } from "../pair-founder/risk-detection";
import {
  buildRecommendation,
  buildVentureUnderstanding,
} from "../pair-founder/context-aware-recommendations";
import { readFounderPreferences } from "../pair-founder/founder-preferences";
import { proposeAlternatives } from "../pair-founder/alternative-proposals";

function confidenceLabel(confidence: number): string {
  if (confidence >= 80) return "Alta confianza";
  if (confidence >= 60) return "Confianza moderada";
  if (confidence >= 40) return "Confianza cautelosa";
  return "Confianza baja — validar antes de escalar";
}

export function generateCEOBrief(mission: Mission): CEOBrief {
  const ctx = missionToContext(mission);
  const memory = readVentureMemory(mission.id);
  const prefs = readFounderPreferences(mission.id);
  const risks = detectRisks(ctx, memory);
  const alternatives = proposeAlternatives(ctx, memory, prefs);
  const recommendation = buildRecommendation(ctx, memory, prefs, alternatives);
  const ventureUnderstanding = buildVentureUnderstanding(ctx, memory);

  const topRisk = risks.sort((a, b) => severityRank(b.severity) - severityRank(a.severity))[0];
  const pending = getPendingDecisions(mission);

  let pendingDecisionsReminder: string | null = null;
  if (pending.length > 0) {
    const titles = pending.slice(0, 3).map((d) => d.title);
    pendingDecisionsReminder = `Tienes ${pending.length} decisión(es) pendiente(s): ${titles.join(", ")}${pending.length > 3 ? "…" : ""}.`;
  }

  const confidence = mission.ceoInsight?.confidence ?? mission.status.confidence;

  return {
    strategicPerspective: ventureUnderstanding || recommendation.justification,
    confidence,
    confidenceLabel: confidenceLabel(confidence),
    topRisk: topRisk ? `${topRisk.title} (${topRisk.severity})` : null,
    topPriority: recommendation.action,
    pendingDecisionsReminder,
    generatedAt: new Date().toISOString(),
  };
}

function severityRank(s: string): number {
  switch (s) {
    case "critical":
      return 4;
    case "high":
      return 3;
    case "medium":
      return 2;
    default:
      return 1;
  }
}

export function formatCEOBriefText(brief: CEOBrief): string {
  const parts = [
    brief.strategicPerspective,
    `Confianza: ${brief.confidence}% (${brief.confidenceLabel})`,
  ];
  if (brief.topRisk) parts.push(`Riesgo principal: ${brief.topRisk}`);
  if (brief.topPriority) parts.push(`Prioridad: ${brief.topPriority}`);
  if (brief.pendingDecisionsReminder) parts.push(brief.pendingDecisionsReminder);
  return parts.join("\n\n");
}
