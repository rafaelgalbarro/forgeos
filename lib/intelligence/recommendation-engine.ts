import type { DiscoveryContext } from "@/lib/discovery/types";
import { applyDiscoveryToTags, getDiscoveryScoreAdjustment } from "@/lib/discovery/discovery-intelligence";
import { previewDiscovery } from "@/lib/discovery";
import type { ForgeIntelligenceReport, IntelligenceInput, IntelligencePreview } from "./types";
import { analyzeBusinessModel } from "./business-model";
import { analyzeCompetition } from "./competition-analysis";
import { runFounderAdvisor } from "./founder-advisor";
import {
  detectTags,
  extractProjectName,
  inferAudience,
  inferCategory,
} from "./heuristics";
import {
  analyzeMarket,
  assessTechnicalComplexity,
  estimateDevelopmentCost,
  estimateMvpTime,
} from "./market-analysis";
import { calculateStartupScore, determineLaunchPriority, scoreLabel } from "./startup-score";

/**
 * Main entry point for Forge Intelligence.
 * Replace internals with AI providers in future versions.
 */
export function generateForgeIntelligenceReport(input: IntelligenceInput): ForgeIntelligenceReport | null {
  const ideaText = input.ideaText.trim();
  if (ideaText.length < 15) return null;

  const discoveryContext = input.discoveryContext ?? null;
  const tags = applyDiscoveryToTags(detectTags(ideaText), discoveryContext);
  const founderAdvisor = runFounderAdvisor(ideaText, discoveryContext);
  const market = analyzeMarket(ideaText, tags);
  const competition = analyzeCompetition(ideaText, tags);
  const businessModel = analyzeBusinessModel(ideaText, tags);
  const technicalComplexity = assessTechnicalComplexity(tags);
  const estimatedMvpTime = estimateMvpTime(ideaText, tags);
  const estimatedDevelopmentCost = estimateDevelopmentCost(ideaText, tags);
  const startupScore = calculateStartupScore(ideaText, tags, founderAdvisor, discoveryContext);
  const launchPriority = determineLaunchPriority(startupScore, founderAdvisor.risks);

  const recommendedBusinessModel =
    discoveryContext?.inferredBusinessModel &&
    discoveryContext.inferredBusinessModel !== "Por validar"
      ? discoveryContext.inferredBusinessModel
      : businessModel.recommended;

  return {
    ideaText,
    projectName: extractProjectName(ideaText),
    category: inferCategory(tags),
    targetAudience: inferAudience(tags, ideaText),
    tags,
    startupScore,
    risks: founderAdvisor.risks,
    opportunities: founderAdvisor.opportunities,
    recommendedBusinessModel,
    technicalComplexity,
    estimatedMvpTime,
    estimatedDevelopmentCost,
    launchPriority,
    founderAdvisor,
    market,
    competition,
    businessModel,
    generatedAt: new Date().toISOString(),
    source: "heuristic",
  };
}

/** Real-time heuristic preview while the user types. */
export function previewIntelligence(
  ideaText: string,
  discoveryContext?: DiscoveryContext | null
): IntelligencePreview | null {
  const text = ideaText.trim();
  if (text.length < 8) return null;

  const tags = applyDiscoveryToTags(detectTags(text), discoveryContext ?? null);
  const discovery = previewDiscovery(text);
  const market = analyzeMarket(text, tags);
  const businessModel = analyzeBusinessModel(text, tags);
  const founderAdvisor = text.length >= 20 ? runFounderAdvisor(text, discoveryContext) : null;
  const startupScore = founderAdvisor
    ? calculateStartupScore(text, tags, founderAdvisor, discoveryContext)
    : Math.min(55, 30 + text.length + (discoveryContext ? getDiscoveryScoreAdjustment(discoveryContext) : 0));

  const monetizacion =
    discoveryContext?.monetizationHints[0] ??
    (discoveryContext?.inferredBusinessModel &&
    discoveryContext.inferredBusinessModel !== "Por validar"
      ? discoveryContext.inferredBusinessModel
      : businessModel.recommended);

  return {
    tags,
    startupScore,
    scoreLabel: scoreLabel(startupScore),
    mercado: market.tamEstimate,
    competencia: market.competitionLevel,
    escalabilidad: market.scalability,
    monetizacion,
    tiempoMvp: estimateMvpTime(text, tags),
    complejidadTecnica: assessTechnicalComplexity(tags),
    probabilidadExito: market.successProbability,
    founderAdvisor,
    projectName: extractProjectName(text),
    category: inferCategory(tags),
    targetAudience: inferAudience(tags, text),
    discoveryProductType: discoveryContext?.inferredProductType ?? discovery?.classification.productType,
    discoveryScore: discovery?.discoveryScore,
  };
}
