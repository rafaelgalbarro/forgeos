import { buildSimulatorAssumptions, listDataSources } from "./assumptions";
import {
  calculateVentureScore,
  deriveConfidence,
  extractAlternatives,
  extractOpportunities,
  extractRisks,
  resolveStartupScore,
} from "./metrics";
import { applySimulatorOverrides, hasActiveOverrides } from "./overrides";
import { buildAllScenarios } from "./scenario-builder";
import { attachRecommendationMeta } from "./recommendations";
import type { VentureSimulatorInput, VentureSimulatorOverrides, VentureSimulatorResult } from "./types";

export function runVentureSimulator(
  input: VentureSimulatorInput,
  overrides?: VentureSimulatorOverrides | null
): VentureSimulatorResult | null {
  const ideaText = input.ideaText?.trim() ?? "";
  if (ideaText.length < 12) return null;

  const baseAssumptions = buildSimulatorAssumptions(input);
  const customAssumptions = hasActiveOverrides(overrides);
  const assumptions = applySimulatorOverrides(baseAssumptions, overrides);
  const startupScore = resolveStartupScore(input);
  const ventureScore = calculateVentureScore(input, assumptions, startupScore);
  const scenarios = buildAllScenarios(assumptions);
  const confidence = deriveConfidence(input, ventureScore);
  const discoveryAnswered = input.discoveryContext?.answers.length ?? 0;

  const partial = {
    startupScore,
    ventureScore,
    confidence,
    scenarios,
    risks: extractRisks(input, assumptions),
    opportunities: extractOpportunities(input),
    recommendedAlternatives: extractAlternatives(input),
    assumptions,
    dataSourcesUsed: listDataSources(input),
    customAssumptions,
    generatedAt: new Date().toISOString(),
  };

  return attachRecommendationMeta(
    partial,
    discoveryAnswered,
    input.intelligenceReport?.founderAdvisor.stance,
    !!input.researchReport
  );
}

export function ventureToSimulatorInput(venture: {
  ideaText: string;
  discoveryContext?: import("@/lib/discovery/types").DiscoveryContext | null;
  intelligenceReport?: import("@/lib/intelligence/types").ForgeIntelligenceReport | null;
  researchReport?: import("@/lib/ai/types/research").ResearchReport | null;
  productPRD?: import("@/lib/ai/types/product").ProductPRD | null;
  researchMeta?: { usedKnowledgeRefs?: { id: string; domain: string; title: string }[] } | null;
  productMeta?: { usedKnowledgeRefs?: { id: string; domain: string; title: string }[] } | null;
}): VentureSimulatorInput {
  const knowledgeRefs = [
    ...(venture.researchMeta?.usedKnowledgeRefs ?? []),
    ...(venture.productMeta?.usedKnowledgeRefs ?? []),
  ].filter((ref, i, arr) => arr.findIndex((r) => r.id === ref.id) === i);

  return {
    ideaText: venture.ideaText,
    discoveryContext: venture.discoveryContext ?? null,
    intelligenceReport: venture.intelligenceReport ?? null,
    researchReport: venture.researchReport ?? null,
    productPRD: venture.productPRD ?? null,
    knowledgeRefs,
  };
}
