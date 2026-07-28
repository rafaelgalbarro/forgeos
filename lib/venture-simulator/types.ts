import type { ProductPRD } from "@/lib/ai/types/product";
import type { KnowledgeRefSummary, ResearchReport } from "@/lib/ai/types/research";
import type { DiscoveryContext } from "@/lib/discovery/types";
import type { ForgeIntelligenceReport } from "@/lib/intelligence/types";

export type VentureRecommendation =
  | "build"
  | "build_small_mvp"
  | "pivot"
  | "research_more"
  | "do_not_build_yet";

export type ConfidenceLevel = "alta" | "media" | "baja";

export type ScenarioType = "conservador" | "base" | "optimista";

export interface ScenarioMetrics {
  scenario: ScenarioType;
  year1Users: number;
  year2Users: number;
  year1Revenue: number;
  year2Revenue: number;
  estimatedCAC: number;
  estimatedLTV: number;
  estimatedConversion: number;
  estimatedChurn: number;
  breakEvenMonths: number | null;
  acquisitionComplexity: string;
  primaryRisk: string;
}

export interface SimulatorAssumptions {
  businessModel: string;
  revenuePerUserYear1: number;
  revenuePerUserYear2: number;
  baseYear1Users: number;
  baseYear2Users: number;
  baseCAC: number;
  baseConversion: number;
  baseChurnMonthly: number;
  monthlyBurnEstimate: number;
  competitionPenalty: number;
  complexityPenalty: number;
  discoveryBonus: number;
  researchBonus: number;
  productBonus: number;
  knowledgeBonus: number;
  primaryRisk: string;
  acquisitionComplexity: string;
}

/** Optional user-edited economic inputs (localStorage pre-build; persisted on venture after accept). */
export interface VentureSimulatorOverrides {
  monthlyPrice?: number;
  estimatedCAC?: number;
  monthlyChurnPercent?: number;
  monthlyBurn?: number;
  commissionPercent?: number;
  estimatedConversion?: number;
}

export interface VentureSimulatorInput {
  ideaText: string;
  discoveryContext?: DiscoveryContext | null;
  intelligenceReport?: ForgeIntelligenceReport | null;
  researchReport?: ResearchReport | null;
  productPRD?: ProductPRD | null;
  knowledgeRefs?: KnowledgeRefSummary[] | null;
}

export interface VentureSimulatorResult {
  startupScore: number;
  ventureScore: number;
  recommendation: VentureRecommendation;
  recommendationLabel: string;
  confidence: ConfidenceLevel;
  scenarios: ScenarioMetrics[];
  risks: string[];
  opportunities: string[];
  recommendedAlternatives: string[];
  suggestedNextAction: string;
  assumptions: SimulatorAssumptions;
  dataSourcesUsed: string[];
  customAssumptions: boolean;
  generatedAt: string;
}
