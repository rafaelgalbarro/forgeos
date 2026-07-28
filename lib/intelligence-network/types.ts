/** Program 9000 — FORGEOS Intelligence Network type contracts. */

import type {
  AnonymizedMetric,
  BenchmarkResult,
  BestPractice,
  ConsentScope,
  ConsentStatus,
  MarketSignal,
  MarketTrend,
  NetworkContext,
  NetworkInsight,
  NetworkOpportunity,
  NetworkRecommendation,
  OrgConsentRecord,
} from "@/lib/network/types";
import { DEMO_DISCLAIMER } from "@/lib/network/types";

export { DEMO_DISCLAIMER };
export const INTELLIGENCE_NETWORK_VERSION = "9000.0.0" as const;
export const PRIVACY_DISCLAIMER_ES =
  "Solo datos agregados y anonimizados. Sin datos cruzados entre organizaciones." as const;

export type { ConsentScope, ConsentStatus, OrgConsentRecord, NetworkContext };

export interface WorkspaceContext extends NetworkContext {
  workspaceId: string;
}

export interface IntelligenceConsentRecord extends OrgConsentRecord {
  workspaceId: string;
  consentRequired: boolean;
  networkEnabled: boolean;
}

export interface IndustryTrend extends MarketTrend {
  momentum: "rising" | "stable" | "cooling";
  sourceCount: number;
}

export interface GrowthSignal {
  id: string;
  label: string;
  growthPct: number;
  sector: string;
  confidence: number;
  disclaimer: typeof DEMO_DISCLAIMER;
}

export interface DetectedPattern {
  id: string;
  name: string;
  description: string;
  frequencyPct: number;
  sectors: string[];
  disclaimer: typeof DEMO_DISCLAIMER;
}

export interface PlaybookEntry {
  id: string;
  title: string;
  summary: string;
  category: string;
  steps: string[];
  adoptionRatePct: number;
  disclaimer: typeof DEMO_DISCLAIMER;
}

export interface FederatedKnowledgeRef {
  id: string;
  topic: string;
  category: string;
  aggregateViews: number;
  relevanceScore: number;
  disclaimer: typeof DEMO_DISCLAIMER;
}

export interface ExecutiveInsight {
  id: string;
  headline: string;
  narrative: string;
  priority: "critical" | "high" | "medium" | "low";
  category: string;
  disclaimer: typeof DEMO_DISCLAIMER;
}

export interface AiRecommendation extends NetworkRecommendation {
  source: "heuristic" | "ai-runtime";
}

export interface SectorAnalysis {
  sector: string;
  ventureCount: number;
  medianGrowthPct: number;
  topOpportunity: string;
  riskLevel: "low" | "medium" | "high";
  disclaimer: typeof DEMO_DISCLAIMER;
}

export interface OpportunitySignal extends NetworkOpportunity {
  signalType: "market" | "product" | "pricing" | "expansion";
}

export interface NetworkDashboardData {
  kpis: { label: string; value: string; delta?: number }[];
  sections: { id: string; title: string; count: number }[];
  privacyStatus: "isolated" | "contributing" | "read-only";
  disclaimer: typeof DEMO_DISCLAIMER;
}

export interface IntelligenceNetworkSnapshot {
  programId: "9000";
  version: typeof INTELLIGENCE_NETWORK_VERSION;
  organizationId: string;
  workspaceId: string;
  ventureId: string;
  generatedAt: string;
  dryRunOnly: true;
  disclaimer: typeof DEMO_DISCLAIMER;
  privacyDisclaimer: typeof PRIVACY_DISCLAIMER_ES;
  consent: IntelligenceConsentRecord;
  canContribute: boolean;
  networkEnabled: boolean;
  benchmarks: BenchmarkResult;
  marketSignals: MarketSignal[];
  industryTrends: IndustryTrend[];
  anonymousMetrics: AnonymizedMetric[];
  patterns: DetectedPattern[];
  playbooks: PlaybookEntry[];
  bestPractices: BestPractice[];
  knowledgeRefs: FederatedKnowledgeRef[];
  executiveInsights: ExecutiveInsight[];
  aiRecommendations: AiRecommendation[];
  opportunities: OpportunitySignal[];
  sectorAnalysis: SectorAnalysis;
  growthSignals: GrowthSignal[];
  insights: NetworkInsight[];
  dashboard: NetworkDashboardData;
  executiveSummaryEs: string;
  privacyChecks: string[];
}
