/** Shared types for Forge Intelligence Layer (Release 0.5). */

export type DecisionStatus = "pending" | "active" | "completed" | "reverted";

export interface Decision {
  id: string;
  ventureId: string;
  title: string;
  description: string;
  motive: string;
  takenBy: string;
  date: string;
  expectedImpact: string;
  actualImpact?: string;
  reversible: boolean;
  dependencies: string[];
  status: DecisionStatus;
}

export type TimelinePhase =
  | "idea"
  | "discovery"
  | "research"
  | "simulator"
  | "product"
  | "build"
  | "launch"
  | "growth";

export interface TimelineNode {
  phase: TimelinePhase;
  label: string;
  date: string;
  impact: string;
  responsible: string;
}

export type PatternType =
  | "saas_preference"
  | "stripe_pricing"
  | "marketplace_preference"
  | "build_delay"
  | "incomplete_discovery";

export interface Pattern {
  id: string;
  type: PatternType;
  label: string;
  description: string;
  ventureIds: string[];
  confidence: number;
  detectedAt: string;
}

export type InsightCategory =
  | "portfolio"
  | "discovery"
  | "simulator"
  | "risk"
  | "business_model";

export interface Insight {
  id: string;
  text: string;
  category: InsightCategory;
  confidence: number;
  generatedAt: string;
}

export type RecommendationPriority = "high" | "medium" | "low";

export interface Recommendation {
  id: string;
  ventureId: string;
  title: string;
  description: string;
  priority: RecommendationPriority;
  rationale: string;
  generatedAt: string;
}

export interface LearningSnapshot {
  ventureId: string;
  lessonsLearned: string[];
  bestPractices: string[];
  repeatedMistakes: string[];
  recommendedActions: string[];
  updatedAt: string;
}

export interface VentureMemoryRecord {
  ventureId: string;
  name: string;
  initialIdea: string;
  discoveryAnswers: Record<string, unknown> | null;
  discoveryContext: Record<string, unknown> | null;
  researchSummary: string | null;
  simulatorResult: Record<string, unknown> | null;
  productPRDMeta: Record<string, unknown> | null;
  hasBuildPlan: boolean;
  changes: { updatedAt: string; deltaDays: number }[];
  decisions: string[];
  assumptions: string[];
  risks: string[];
  results: string[];
  date: string;
  author: string;
  status: string;
  syncedAt: string;
}

export interface PortfolioMemory {
  totalVentures: number;
  ventureIds: string[];
  aggregatedRisks: string[];
  aggregatedOpportunities: string[];
  patterns: Pattern[];
  insights: Insight[];
  lastUpdated: string;
}

export interface HistoricalEvent {
  id: string;
  ventureId: string;
  type: string;
  title: string;
  description: string;
  date: string;
  metadata?: Record<string, unknown>;
}

export interface IntelligenceMetrics {
  totalDecisions: number;
  completedDecisions: number;
  totalPatterns: number;
  totalInsights: number;
  totalLessons: number;
  venturesWithSimulator: number;
  venturesWithDiscovery: number;
  averageSimulatorScore: number | null;
  lastSyncedAt: string | null;
}

export interface CeoBriefing {
  id: string;
  date: string;
  summary: string;
  highlights: string[];
}

export interface CeoPriority {
  id: string;
  title: string;
  description: string;
  status: "open" | "in_progress" | "done";
  createdAt: string;
}

export interface CeoResult {
  id: string;
  title: string;
  outcome: string;
  date: string;
}

export interface CeoMemory {
  briefings: CeoBriefing[];
  recommendations: Recommendation[];
  priorities: CeoPriority[];
  results: CeoResult[];
  updatedAt: string;
}
