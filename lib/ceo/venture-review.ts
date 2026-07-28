import type { VentureProject } from "@/lib/domain/venture";
import { getVentureHealth } from "@/lib/health";
import { resolveNextAction } from "@/lib/portfolio/next-action";
import { resolveScores } from "@/lib/portfolio/venture-status";
import { resolveLifecycleState } from "@/lib/fos";

export interface VentureReview {
  ventureId: string;
  ventureName: string;
  lifecycleStage: string;
  healthCategory: string;
  nextAction: string;
  startupScore: number;
  ventureScore: number | null;
  summary: string;
}

export function reviewVenture(venture: VentureProject): VentureReview {
  const health = getVentureHealth(venture);
  const scores = resolveScores(venture);
  const lifecycle = resolveLifecycleState(venture);
  const next = resolveNextAction(venture);

  let summary = `${venture.name} está en fase ${lifecycle.label}.`;
  if (health.category === "blocked") {
    summary = `Bloqueada: ${health.reason}`;
  } else if (health.category === "at-risk") {
    summary = `En riesgo: ${health.reason}`;
  } else if (health.category === "scaling") {
    summary = `Potencial de escala detectado.`;
  }

  return {
    ventureId: venture.id,
    ventureName: venture.name,
    lifecycleStage: lifecycle.label,
    healthCategory: health.categoryLabel,
    nextAction: next.label,
    startupScore: scores.startupScore,
    ventureScore: scores.ventureScore,
    summary,
  };
}

export function reviewAllVentures(ventures: VentureProject[]): VentureReview[] {
  return ventures.map(reviewVenture);
}
