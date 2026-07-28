import type { VentureProject } from "@/lib/domain/venture";
import { resolveScores } from "@/lib/portfolio/venture-status";
import type { FosVentureContext } from "../types";

export type VentureLifecycleStage =
  | "ideation"
  | "discovery"
  | "research"
  | "validation"
  | "building"
  | "ready"
  | "scaling";

export interface LifecycleState {
  ventureId: string;
  stage: VentureLifecycleStage;
  label: string;
  progress: number;
}

const STAGE_LABELS: Record<VentureLifecycleStage, string> = {
  ideation: "Ideación",
  discovery: "Discovery",
  research: "Research",
  validation: "Validación",
  building: "Build",
  ready: "Lista",
  scaling: "Escalando",
};

function resolveStage(venture: VentureProject): VentureLifecycleStage {
  const scores = resolveScores(venture);
  const remaining = venture.discoveryContext?.remainingQuestions?.length ?? 0;
  const answered = venture.discoveryContext?.answers.length ?? 0;

  if (remaining > 0 || answered < 2) return "discovery";
  if (!venture.researchReport) return "research";
  if (!venture.productPRD && venture.status !== "building") return "validation";
  if (venture.status === "building") return "building";
  if (scores.ventureScore !== null && scores.ventureScore >= 70) return "scaling";
  if (venture.status === "ready") return "ready";
  return "validation";
}

function stageProgress(stage: VentureLifecycleStage): number {
  const map: Record<VentureLifecycleStage, number> = {
    ideation: 10,
    discovery: 25,
    research: 40,
    validation: 55,
    building: 75,
    ready: 90,
    scaling: 100,
  };
  return map[stage];
}

export function resolveLifecycleState(venture: VentureProject): LifecycleState {
  const stage = resolveStage(venture);
  return {
    ventureId: venture.id,
    stage,
    label: STAGE_LABELS[stage],
    progress: stageProgress(stage),
  };
}

export function resolveAllLifecycleStates(ventures: VentureProject[]): LifecycleState[] {
  return ventures.map(resolveLifecycleState);
}

export function lifecycleToContext(
  venture: VentureProject,
  rank: number
): FosVentureContext {
  const state = resolveLifecycleState(venture);
  const scores = resolveScores(venture);
  let riskLevel: FosVentureContext["riskLevel"] = "low";

  if (state.stage === "discovery" || !venture.researchReport) riskLevel = "high";
  else if (scores.confidence === "baja" || (scores.ventureScore !== null && scores.ventureScore < 45)) {
    riskLevel = "medium";
  }

  return {
    ventureId: venture.id,
    ventureName: venture.name,
    lifecycleStage: state.label,
    attentionWeight: Math.max(0, 100 - rank * 15),
    riskLevel,
    priorityRank: rank,
  };
}
