import type {
  ConfidenceLevel,
  VentureRecommendation,
  VentureSimulatorResult,
} from "./types";

const RECOMMENDATION_LABELS: Record<VentureRecommendation, string> = {
  build: "Build",
  build_small_mvp: "Build small MVP",
  pivot: "Pivot",
  research_more: "Research more",
  do_not_build_yet: "Do not build yet",
};

export function recommendationLabel(rec: VentureRecommendation): string {
  return RECOMMENDATION_LABELS[rec];
}

export function deriveRecommendation(
  ventureScore: number,
  startupScore: number,
  discoveryAnswered: number,
  stance?: "challenge" | "caution" | "proceed",
  hasResearch?: boolean
): VentureRecommendation {
  if (stance === "challenge" && ventureScore < 50) return "pivot";
  if (ventureScore < 30) return "do_not_build_yet";
  if (!hasResearch && discoveryAnswered < 2 && ventureScore < 45) return "research_more";
  if (ventureScore >= 68 && startupScore >= 60 && stance !== "challenge") return "build";
  if (ventureScore >= 48 && ventureScore < 68) return "build_small_mvp";
  if (stance === "challenge" || ventureScore < 42) return "pivot";
  if (!hasResearch || discoveryAnswered < 2) return "research_more";
  return "build_small_mvp";
}

export function deriveSuggestedNextAction(
  recommendation: VentureRecommendation,
  confidence: ConfidenceLevel
): string {
  const lowConfidence = confidence === "baja" ? " Refuerza Discovery y Research antes de invertir en build." : "";

  switch (recommendation) {
    case "build":
      return `Ejecuta el workflow de build con el MVP definido en Product.${lowConfidence}`;
    case "build_small_mvp":
      return `Construye un MVP acotado (4-6 semanas) y valida con 20-50 usuarios reales.${lowConfidence}`;
    case "pivot":
      return "Reformula el wedge o el segmento usando las alternativas sugeridas antes de escribir código.";
    case "research_more":
      return "Completa Discovery, ejecuta Research Worker y contrasta competidores antes de decidir build.";
    case "do_not_build_yet":
      return "Pausa el build. Responde preguntas críticas del Founder Advisor y reduce el alcance del problema.";
    default:
      return "Revisa escenarios y decisiones aclaradas antes de continuar.";
  }
}

export function attachRecommendationMeta(
  partial: Omit<VentureSimulatorResult, "recommendation" | "recommendationLabel" | "suggestedNextAction">,
  discoveryAnswered: number,
  stance?: "challenge" | "caution" | "proceed",
  hasResearch?: boolean
): VentureSimulatorResult {
  const recommendation = deriveRecommendation(
    partial.ventureScore,
    partial.startupScore,
    discoveryAnswered,
    stance,
    hasResearch
  );

  return {
    ...partial,
    recommendation,
    recommendationLabel: recommendationLabel(recommendation),
    suggestedNextAction: deriveSuggestedNextAction(recommendation, partial.confidence),
  };
}
