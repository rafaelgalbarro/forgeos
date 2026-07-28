import type { DefinitionRisk, DiscoveryResult, MissingDecision } from "./types";

export function scoreLabel(score: number): string {
  if (score >= 75) return "Idea bien definida";
  if (score >= 55) return "Definición parcial";
  if (score >= 35) return "Requiere aclaraciones";
  return "Muy ambigua";
}

export function calculateDiscoveryScore(params: {
  ideaText: string;
  confidence: number;
  missingDecisions: MissingDecision[];
  ambiguities: string[];
  definitionRisks: DefinitionRisk[];
  questionCount: number;
}): number {
  const { ideaText, confidence, missingDecisions, ambiguities, definitionRisks } = params;

  let score = Math.round(confidence * 60);

  if (ideaText.length >= 40) score += 8;
  if (ideaText.length >= 80) score += 5;

  score -= missingDecisions.filter((m) => m.severity === "high").length * 10;
  score -= missingDecisions.filter((m) => m.severity === "medium").length * 5;
  score -= ambiguities.length * 4;
  score -= definitionRisks.length * 3;

  return Math.max(0, Math.min(100, Math.round(score)));
}

export function attachDiscoveryScore(result: Omit<DiscoveryResult, "discoveryScore" | "scoreLabel">): DiscoveryResult {
  const discoveryScore = calculateDiscoveryScore({
    ideaText: result.ideaText,
    confidence: result.classification.confidence,
    missingDecisions: result.missingDecisions,
    ambiguities: result.ambiguities,
    definitionRisks: result.definitionRisks,
    questionCount: result.questions.length,
  });

  return {
    ...result,
    discoveryScore,
    scoreLabel: scoreLabel(discoveryScore),
  };
}
