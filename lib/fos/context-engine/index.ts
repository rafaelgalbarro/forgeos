import type { VentureProject } from "@/lib/domain/venture";
import { resolveScores } from "@/lib/portfolio/venture-status";
import { resolveAllLifecycleStates } from "../lifecycle-engine";
import type { FosVentureContext } from "../types";

export interface VentureContextDetail {
  ventureId: string;
  ventureName: string;
  hasDiscovery: boolean;
  hasResearch: boolean;
  hasProduct: boolean;
  hasSimulation: boolean;
  sectionCount: number;
  startupScore: number;
  ventureScore: number | null;
  confidence: string;
}

export function buildVentureContext(venture: VentureProject): VentureContextDetail {
  const scores = resolveScores(venture);
  return {
    ventureId: venture.id,
    ventureName: venture.name,
    hasDiscovery: (venture.discoveryContext?.answers.length ?? 0) >= 2,
    hasResearch: !!venture.researchReport,
    hasProduct: !!venture.productPRD,
    hasSimulation: scores.hasSimulation,
    sectionCount: venture.sections.length,
    startupScore: scores.startupScore,
    ventureScore: scores.ventureScore,
    confidence: scores.confidence,
  };
}

export function buildAllVentureContexts(ventures: VentureProject[]): VentureContextDetail[] {
  return ventures.map(buildVentureContext);
}

export function contextsToFosContexts(ventures: VentureProject[]): FosVentureContext[] {
  const sorted = [...ventures].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
  const lifecycle = resolveAllLifecycleStates(sorted);

  return sorted.map((v, i) => {
    const ctx = buildVentureContext(v);
    const life = lifecycle.find((l) => l.ventureId === v.id)!;
    let riskLevel: FosVentureContext["riskLevel"] = "low";
    if (!ctx.hasResearch || life.stage === "discovery") riskLevel = "high";
    else if (ctx.confidence === "baja") riskLevel = "medium";

    return {
      ventureId: v.id,
      ventureName: v.name,
      lifecycleStage: life.label,
      attentionWeight: Math.max(10, 100 - i * 12),
      riskLevel,
      priorityRank: i + 1,
    };
  });
}
