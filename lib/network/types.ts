/** RC10 — ForgeOS Network type contracts. */

export const DEMO_DISCLAIMER = "Simulación con datos demo" as const;
export const CONSENT_REQUIRED_MESSAGE =
  "Se requiere consentimiento explícito para contribuir a la red" as const;

export type ConsentScope =
  | "benchmarks"
  | "signals"
  | "best-practices"
  | "trends"
  | "opportunities";

export type ConsentStatus = "granted" | "denied" | "pending";

export interface OrgConsentRecord {
  organizationId: string;
  scopes: Record<ConsentScope, ConsentStatus>;
  grantedAt?: string;
  revokedAt?: string;
  updatedAt: string;
}

export interface AnonymizedMetric {
  id: string;
  label: string;
  value: number;
  unit: string;
  sampleSize: number;
  sector: string;
  anonymized: true;
  disclaimer: typeof DEMO_DISCLAIMER;
}

export interface BenchmarkMetric {
  label: string;
  ventureValue: number | string;
  benchmarkValue: number | string;
  unit: string;
  delta: "above" | "below" | "inline";
}

export interface BenchmarkResult {
  sector: string;
  metrics: BenchmarkMetric[];
  growthRatePct: number;
  sampleSize: number;
  disclaimer: typeof DEMO_DISCLAIMER;
  anonymized: true;
}

export interface MarketSignal {
  id: string;
  title: string;
  description: string;
  strength: "strong" | "moderate" | "weak";
  sector: string;
  direction: "up" | "down" | "stable";
  confidence: number;
  disclaimer: typeof DEMO_DISCLAIMER;
}

export interface BestPractice {
  id: string;
  title: string;
  summary: string;
  category: string;
  adoptionRatePct: number;
  impactScore: number;
  disclaimer: typeof DEMO_DISCLAIMER;
}

export interface MarketTrend {
  id: string;
  label: string;
  growthPct: number;
  horizon: string;
  sector: string;
  relevanceScore: number;
  disclaimer: typeof DEMO_DISCLAIMER;
}

export interface NetworkOpportunity {
  id: string;
  title: string;
  description: string;
  sector: string;
  matchScore: number;
  estimatedImpactPct: number;
  disclaimer: typeof DEMO_DISCLAIMER;
}

export interface NetworkRecommendation {
  id: string;
  title: string;
  body: string;
  impactEstimate: string;
  confidence: number;
  category: "pricing" | "growth" | "product" | "gtm";
  disclaimer: typeof DEMO_DISCLAIMER;
}

export interface AnonymousComparison {
  metric: string;
  yourValue: number | string;
  networkMedian: number | string;
  percentile: number;
  unit: string;
  disclaimer: typeof DEMO_DISCLAIMER;
}

export interface NetworkInsight {
  id: string;
  headline: string;
  detail: string;
  type: "benchmark" | "signal" | "trend" | "opportunity" | "recommendation";
  priority: "high" | "medium" | "low";
  disclaimer: typeof DEMO_DISCLAIMER;
}

export interface NetworkContext {
  organizationId: string;
  ventureId: string;
  sector: string;
  ventureName: string;
  monthlyRevenue?: number;
  pricingPlanEur?: number;
  mrrGrowthPct?: number;
}

export interface NetworkSnapshot {
  organizationId: string;
  ventureId: string;
  generatedAt: string;
  dryRunOnly: true;
  disclaimer: typeof DEMO_DISCLAIMER;
  consent: OrgConsentRecord;
  canContribute: boolean;
  benchmarks: BenchmarkResult;
  signals: MarketSignal[];
  bestPractices: BestPractice[];
  trends: MarketTrend[];
  opportunities: NetworkOpportunity[];
  recommendations: NetworkRecommendation[];
  comparisons: AnonymousComparison[];
  insights: NetworkInsight[];
  executiveSummaryEs: string;
}

export interface NetworkLabSnapshot {
  organizationId: string;
  ventureId: string;
  engineVersion: string;
  consentScopes: ConsentScope[];
  snapshot: NetworkSnapshot;
  privacyChecks: string[];
  anonymizationSample: AnonymizedMetric;
}
