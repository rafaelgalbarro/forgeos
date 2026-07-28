/** Compare current mission state vs strategy goals. */

import type { Mission } from "../types";
import type { MisalignedArea, StrategicAlignment, ExitStrategyType } from "./types";
import { getExitStrategyConfig } from "./exit-strategy-registry";
import { generateAdaptationPlan } from "./strategy-adaptations";
import { readVentureMemory } from "../pair-founder/venture-memory";

function domainProgress(mission: Mission, snapshotIds: string[]): number {
  const snaps = mission.snapshots.filter((s) => snapshotIds.includes(s.id));
  if (!snaps.length) return 0;
  return snaps.reduce((sum, s) => sum + s.progress, 0) / snaps.length;
}

function checkMisalignment(
  domain: import("./types").AdaptationDomain,
  mission: Mission,
  strategy: ExitStrategyType,
  weight: number
): MisalignedArea | null {
  const snapshotMap: Record<import("./types").AdaptationDomain, string[]> = {
    roadmap: ["prd", "architecture"],
    finanzas: ["financials", "investorReadiness", "businessModel"],
    marketing: ["marketing", "brand"],
    producto: ["prd", "application", "website"],
  };

  const progress = domainProgress(mission, snapshotMap[domain]);
  const threshold = weight * 60;

  if (progress >= threshold) return null;

  const plan = generateAdaptationPlan(strategy);
  const topRec = plan.recommendations.find((r) => r.domain === domain && r.priority === "high");

  return {
    domain,
    label: getExitStrategyConfig(strategy).labelEs + " — " + domain,
    currentState: `Progreso ${Math.round(progress)}%`,
    expectedState: topRec?.action ?? `≥ ${Math.round(threshold)}% para ${strategy}`,
    severity: progress < threshold * 0.5 ? "high" : progress < threshold * 0.75 ? "medium" : "low",
  };
}

export function computeStrategicAlignment(mission: Mission, strategy: ExitStrategyType): StrategicAlignment {
  const config = getExitStrategyConfig(strategy);
  const weights = config.domainWeights;
  const memory = readVentureMemory(mission.id);

  const misalignedAreas: MisalignedArea[] = [];
  for (const domain of ["roadmap", "finanzas", "marketing", "producto"] as const) {
    const area = checkMisalignment(domain, mission, strategy, weights[domain]);
    if (area) misalignedAreas.push(area);
  }

  const alignedAreas: string[] = [];
  if (domainProgress(mission, ["financials"]) >= 50 && weights.finanzas > 0.7) {
    alignedAreas.push("Modelo financiero en progreso acorde a estrategia");
  }
  if (domainProgress(mission, ["marketing"]) >= 50 && weights.marketing > 0.6) {
    alignedAreas.push("Marketing alineado con intensidad GTM esperada");
  }
  if (memory.strategyNotes.some((n) => n.toLowerCase().includes(strategy.replace("_", " ")))) {
    alignedAreas.push("Notas de estrategia coherentes con exit path");
  }
  if (mission.phase !== "UNDERSTAND") {
    alignedAreas.push(`Fase ${mission.phase} avanzando hacia objetivos de ${config.labelEs}`);
  }

  const domainScores = (["roadmap", "finanzas", "marketing", "producto"] as const).map((d) => {
    const snapshotMap: Record<typeof d, string[]> = {
      roadmap: ["prd", "architecture"],
      finanzas: ["financials", "investorReadiness"],
      marketing: ["marketing", "brand"],
      producto: ["prd", "application"],
    };
    const progress = domainProgress(mission, snapshotMap[d]);
    const weight = weights[d];
    return Math.min(100, progress * weight + (progress > 30 ? 20 : 0));
  });

  const score = Math.round(
    domainScores.reduce((a, b) => a + b, 0) / domainScores.length -
      misalignedAreas.filter((m) => m.severity === "high").length * 8
  );

  return {
    score: Math.max(0, Math.min(100, score)),
    strategy,
    alignedAreas: alignedAreas.slice(0, 4),
    misalignedAreas,
    computedAt: new Date().toISOString(),
  };
}
