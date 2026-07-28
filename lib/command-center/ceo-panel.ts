/** Program 4500 — CEO briefing panel. */

import type { VentureProject } from "@/lib/domain/venture";
import { runCeoEngine } from "@/lib/ceo";
import { runFos } from "@/lib/fos";
import { buildFounderCeoSection } from "@/lib/founder-dashboard";
import { getFounderName } from "@/lib/autonomous-organization";
import { planExecutivePriorities } from "@/lib/autonomous-organization";
import type { CeoPanelData } from "./types";

export function buildCeoPanel(ventures: VentureProject[]): CeoPanelData {
  const founderName = getFounderName();
  const fos = runFos(ventures);
  const ceoEngine = runCeoEngine(ventures, fos);
  const founderCeo = buildFounderCeoSection(ventures);
  const priorities = planExecutivePriorities();

  const progressBase = ventures.length > 0 ? 62 : 40;
  const confidenceScore = Math.min(
    95,
    Math.round(progressBase + (ceoEngine.executiveSummary.confidence ?? 0) * 0.3)
  );

  return {
    greeting: `Buenos días ${founderName}.`,
    executiveSummary: founderCeo.summary,
    dailyGoals: priorities.slice(0, 4).map((p) => p.title),
    risks: ceoEngine.criticalRisks.map((r) => r.label).slice(0, 4),
    recommendations: [
      founderCeo.recommendation,
      ceoEngine.recommendation.rationale,
    ].filter(Boolean),
    suggestedActions: [
      ceoEngine.topPriority?.action ?? founderCeo.ctaLabel,
      ceoEngine.recommendation.action,
    ].filter(Boolean).slice(0, 3),
    confidenceScore,
    ctaLabel: founderCeo.ctaLabel,
    ctaHref: founderCeo.ctaHref,
  };
}
