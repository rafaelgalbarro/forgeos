/** RC8 — Venture Intelligence type contracts. */

export const HEURISTIC_DISCLAIMER = "estimación heurística" as const;
export const PENDING_DATA_DISCLAIMER = "pendiente de datos reales" as const;

export type DataConfidence = "heuristic" | "partial" | "verified";

export interface VentureFinancialInputs {
  ventureId: string;
  ventureName: string;
  stage: "pre-seed" | "seed" | "series-a" | "growth";
  cashOnHand: number;
  monthlyBurn: number;
  monthlyRevenue: number;
  mrrGrowthRatePct: number;
  teamSize: number;
  monthsOperating: number;
  marketSizeTAM?: number;
  customerCount?: number;
  churnRatePct?: number;
}

export interface ScoredMetric {
  score: number;
  maxScore: number;
  label: string;
  disclaimer: typeof HEURISTIC_DISCLAIMER | typeof PENDING_DATA_DISCLAIMER;
  confidence: DataConfidence;
  factors: string[];
}

export interface ValuationResult {
  amountEur: number;
  rangeLowEur: number;
  rangeHighEur: number;
  method: string;
  disclaimer: typeof HEURISTIC_DISCLAIMER;
  confidence: DataConfidence;
}

export interface RunwayResult {
  months: number;
  cashOnHand: number;
  monthlyBurn: number;
  runwayEndDate: string;
  disclaimer: typeof HEURISTIC_DISCLAIMER;
}

export interface BurnRateResult {
  monthlyBurn: number;
  burnPerEmployee: number;
  revenueCoveragePct: number;
  netBurn: number;
  disclaimer: typeof HEURISTIC_DISCLAIMER;
}

export interface ForecastPoint {
  month: number;
  revenue: number;
  burn: number;
  cash: number;
}

export interface ForecastResult {
  horizonMonths: number;
  points: ForecastPoint[];
  projectedRunwayMonths: number;
  disclaimer: typeof HEURISTIC_DISCLAIMER;
}

export interface FundraisingResult {
  amountNeededEur: number;
  targetRound: string;
  useOfFunds: string[];
  timelineMonths: number;
  disclaimer: typeof HEURISTIC_DISCLAIMER;
}

export interface InvestorReadinessResult {
  score: number;
  checklist: DueDiligenceItem[];
  gaps: string[];
  recommendedNextStep: string;
  disclaimer: typeof HEURISTIC_DISCLAIMER;
}

export interface DueDiligenceItem {
  id: string;
  category: string;
  label: string;
  status: "ready" | "partial" | "missing";
  priority: "high" | "medium" | "low";
}

export interface RiskItem {
  id: string;
  category: string;
  severity: "high" | "medium" | "low";
  label: string;
  mitigation?: string;
}

export interface RiskResult {
  overallScore: number;
  risks: RiskItem[];
  topRisks: string[];
  disclaimer: typeof HEURISTIC_DISCLAIMER;
}

export interface ExitStrategyResult {
  readinessScore: number;
  scenarios: Array<{
    type: "acquisition" | "ipo" | "secondary" | "bootstrap";
    probability: number;
    timelineYears: number;
    notes: string;
  }>;
  disclaimer: typeof HEURISTIC_DISCLAIMER;
}

export interface BenchmarkResult {
  sector: string;
  metrics: Array<{
    label: string;
    ventureValue: number | string;
    benchmarkValue: number | string;
    unit: string;
    delta: "above" | "below" | "inline";
  }>;
  disclaimer: typeof HEURISTIC_DISCLAIMER;
}

export interface MaScenarioResult {
  attractivenessScore: number;
  potentialAcquirers: string[];
  synergyAreas: string[];
  disclaimer: typeof HEURISTIC_DISCLAIMER;
}

export interface InvestorRoomSection {
  id: string;
  title: string;
  status: "ready" | "partial" | "missing";
  documents: string[];
}

export interface InvestorRoomResult {
  readinessPct: number;
  sections: InvestorRoomSection[];
  disclaimer: typeof HEURISTIC_DISCLAIMER;
}

export interface VentureIntelligenceSnapshot {
  ventureId: string;
  ventureName: string;
  generatedAt: string;
  dryRunOnly: true;
  valuation: ValuationResult;
  runway: RunwayResult;
  burnRate: BurnRateResult;
  forecast: ForecastResult;
  fundraising: FundraisingResult;
  investorReadiness: InvestorReadinessResult;
  dueDiligence: DueDiligenceItem[];
  risks: RiskResult;
  growthScore: ScoredMetric;
  marketScore: ScoredMetric;
  executionScore: ScoredMetric;
  ventureScore: ScoredMetric;
  exitStrategy: ExitStrategyResult;
  maAnalysis: MaScenarioResult;
  benchmarks: BenchmarkResult;
  investorRoom: InvestorRoomResult;
  executiveSummaryEs: string;
}

export type CapitalAiDepartmentId =
  | "investment-ai"
  | "finance-ai"
  | "growth-ai"
  | "capital-ai"
  | "board-advisor-ai"
  | "market-intelligence-ai";

export interface CapitalAiDepartmentResult {
  departmentId: CapitalAiDepartmentId;
  departmentName: string;
  insight: string;
  confidence: number;
  mode: "heuristic" | "real-ai";
  disclaimer: typeof HEURISTIC_DISCLAIMER | typeof PENDING_DATA_DISCLAIMER;
}
