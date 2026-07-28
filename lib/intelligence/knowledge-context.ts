import type { DetectedTag, FounderRecommendation } from "./types";
import { detectTags } from "./heuristics";
import {
  getRecommendedPatternsForIdea,
  searchKnowledge,
} from "@/lib/knowledge/knowledge-queries";
import type { BusinessModelEntry } from "@/lib/knowledge/business-models";
import type { CompetitorEntry } from "@/lib/knowledge/competitors";

export interface IntelligenceKnowledgeHints {
  scoreAdjustment: number;
  recommendations: FounderRecommendation[];
  patternTitles: string[];
  businessModelTitles: string[];
  competitorTitles: string[];
}

export function getIntelligenceKnowledgeHints(
  ideaText: string,
  tags?: DetectedTag[]
): IntelligenceKnowledgeHints {
  const detected = tags ?? detectTags(ideaText);
  const tagIds = detected.map((t) => t.id);
  const matches = getRecommendedPatternsForIdea(ideaText, detected);

  const businessModelTitles = matches.businessModels.map((m) => m.entry.title);
  const competitorTitles = matches.competitors.map((m) => m.entry.title);
  const patternTitles = matches.patterns.map((m) => m.entry.title);

  let scoreAdjustment = 0;
  if (matches.businessModels.length > 0) scoreAdjustment += 3;
  if (matches.patterns.length >= 2) scoreAdjustment += 2;
  if (tagIds.includes("marketplace") && matches.patterns.some((p) => p.entry.tags.includes("marketplace"))) {
    scoreAdjustment -= 2;
  }
  if (tagIds.includes("b2b") && matches.businessModels.some((m) => (m.entry as BusinessModelEntry).targetSegment === "B2B")) {
    scoreAdjustment += 2;
  }

  const recommendations: FounderRecommendation[] = [];

  if (matches.businessModels[0]) {
    const bm = matches.businessModels[0].entry as BusinessModelEntry;
    recommendations.push({
      text: `Modelo de referencia: ${bm.title} — ${bm.pricingModel}.`,
      reason: `Coincide con tags detectados: ${matches.businessModels[0].matchedTags.join(", ") || "idea"}.`,
    });
  }

  if (matches.competitors[0]) {
    const comp = matches.competitors[0].entry as CompetitorEntry;
    recommendations.push({
      text: `Estudia a ${comp.title} (${comp.category}) antes de definir tu wedge.`,
      reason: comp.weaknesses[0] ?? "Benchmark de categoría en knowledge base.",
    });
  }

  if (matches.patterns[0]) {
    recommendations.push({
      text: `Patrón recomendado: ${matches.patterns[0].entry.title}.`,
      reason: matches.patterns[0].entry.description,
    });
  }

  const aiCompetitors = searchKnowledge("AI", { domain: "competitors", limit: 2 });
  if (tagIds.includes("ai") && aiCompetitors.length > 0) {
    scoreAdjustment += 1;
  }

  return {
    scoreAdjustment: Math.max(-5, Math.min(8, scoreAdjustment)),
    recommendations: recommendations.slice(0, 2),
    patternTitles,
    businessModelTitles,
    competitorTitles,
  };
}
