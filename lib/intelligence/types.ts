export type IntelligenceSource = "heuristic" | "ai";

export type LaunchPriority = "alta" | "media" | "baja";

export type TagCategory = "product" | "business" | "tech" | "model";

export interface DetectedTag {
  id: string;
  label: string;
  category: TagCategory;
}

export interface IntelligenceRisk {
  title: string;
  description: string;
  severity: "alta" | "media" | "baja";
}

export interface IntelligenceOpportunity {
  title: string;
  description: string;
  probability: "alta" | "media";
}

export interface IntelligenceAlternative {
  title: string;
  description: string;
  rationale: string;
}

export interface FounderAdvisorOutput {
  headline: string;
  summary: string;
  stance: "challenge" | "caution" | "proceed";
  risks: IntelligenceRisk[];
  opportunities: IntelligenceOpportunity[];
  alternatives: IntelligenceAlternative[];
  recommendations: FounderRecommendation[];
  questions: string[];
  shouldCompare: boolean;
}

export interface FounderRecommendation {
  text: string;
  reason: string;
}

export interface MarketAnalysisOutput {
  tamEstimate: string;
  growthTrend: string;
  competitionLevel: string;
  innovationLevel: string;
  successProbability: string;
  scalability: string;
}

export interface CompetitionAnalysisOutput {
  landscape: string;
  incumbents: string[];
  windowOfOpportunity: string;
  differentiationAngle: string;
}

export interface BusinessModelOutput {
  recommended: string;
  alternatives: string[];
  revenueMechanism: string;
  reasoning: string;
}

export interface ForgeIntelligenceReport {
  ideaText: string;
  projectName: string;
  category: string;
  targetAudience: string;
  tags: DetectedTag[];
  startupScore: number;
  risks: IntelligenceRisk[];
  opportunities: IntelligenceOpportunity[];
  recommendedBusinessModel: string;
  technicalComplexity: string;
  estimatedMvpTime: string;
  estimatedDevelopmentCost: string;
  launchPriority: LaunchPriority;
  founderAdvisor: FounderAdvisorOutput;
  market: MarketAnalysisOutput;
  competition: CompetitionAnalysisOutput;
  businessModel: BusinessModelOutput;
  generatedAt: string;
  source: IntelligenceSource;
}

export interface IntelligenceInput {
  ideaText: string;
  discoveryContext?: import("@/lib/discovery/types").DiscoveryContext | null;
}

/** Real-time preview while the user types (heuristic only). */
export interface IntelligencePreview {
  tags: DetectedTag[];
  startupScore: number;
  scoreLabel: string;
  mercado: string;
  competencia: string;
  escalabilidad: string;
  monetizacion: string;
  tiempoMvp: string;
  complejidadTecnica: string;
  probabilidadExito: string;
  founderAdvisor: FounderAdvisorOutput | null;
  projectName: string;
  category: string;
  targetAudience: string;
  /** Discovery Engine hint — shared classification with Forge Intelligence. */
  discoveryProductType?: string;
  discoveryScore?: number;
}
