/** PROGRAM 5800 — Investor Mode type contracts. */

import type { HEURISTIC_DISCLAIMER } from "@/lib/venture-intelligence";

export const INVESTOR_MODE_VERSION = "PROGRAM 5800 — INVESTOR MODE" as const;
export const INVESTOR_STORAGE_PREFIX = "forgeos-investor-" as const;

export type DataRoomCategory = "legal" | "financial" | "product" | "team";

export interface DataRoomDoc {
  id: string;
  category: DataRoomCategory;
  title: string;
  description: string;
  status: "ready" | "partial" | "missing";
  priority: "high" | "medium" | "low";
}

export interface DeckSlide {
  id: string;
  order: number;
  title: string;
  bullets: string[];
  notes?: string;
}

export interface FinancialYearProjection {
  year: number;
  revenue: number;
  burn: number;
  netCash: number;
  headcount: number;
}

export interface FinancialModel {
  currency: "EUR";
  horizonYears: number;
  monthlyBurn: number;
  monthlyRevenue: number;
  runwayMonths: number;
  projections: FinancialYearProjection[];
  assumptions: string[];
  disclaimer: typeof HEURISTIC_DISCLAIMER;
}

export interface ValuationSummary {
  methodology: string;
  amountEur: number;
  rangeLowEur: number;
  rangeHighEur: number;
  confidence: "heuristic" | "partial" | "verified";
  factors: string[];
  disclaimer: typeof HEURISTIC_DISCLAIMER;
}

export interface DDChecklistItem {
  id: string;
  category: string;
  label: string;
  status: "ready" | "partial" | "missing";
  priority: "high" | "medium" | "low";
  completed: boolean;
}

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
}

export interface FundingPlan {
  roundSizeEur: number;
  targetRound: string;
  useOfFunds: Array<{ label: string; pct: number }>;
  timelineMonths: number;
  targetInvestors: string[];
  milestones: string[];
  disclaimer: typeof HEURISTIC_DISCLAIMER;
}

export interface ReadinessBreakdown {
  dataRoom: number;
  deck: number;
  financialModel: number;
  valuation: number;
  dueDiligence: number;
  faq: number;
  fundingPlan: number;
  ventureIntelligence: number;
}

export interface InvestorReadinessScore {
  score: number;
  breakdown: ReadinessBreakdown;
  gaps: string[];
  recommendedNextStep: string;
  disclaimer: typeof HEURISTIC_DISCLAIMER;
}

export interface InvestorPackage {
  missionId: string;
  ventureName: string;
  generatedAt: string;
  version: typeof INVESTOR_MODE_VERSION;
  dataRoom: DataRoomDoc[];
  deck: DeckSlide[];
  financialModel: FinancialModel;
  valuation: ValuationSummary;
  dueDiligence: DDChecklistItem[];
  faq: FAQItem[];
  fundingPlan: FundingPlan;
  readiness: InvestorReadinessScore;
}

export interface InvestorModeSnapshot {
  version: typeof INVESTOR_MODE_VERSION;
  generatedAt: string;
  readinessScore: number;
  readinessLabel: string;
  deliverableCount: number;
  gaps: string[];
}

export interface VentureIntelligenceContext {
  ventureName: string;
  intelligenceScore: number;
  investorReadinessScore: number;
  valuationEur: number;
  runwayMonths: number;
  fundraisingEur: number;
  marketScore: number;
  growthScore: number;
  executionScore: number;
  executiveSummary: string;
  dueDiligenceItems: Array<{ id: string; category: string; label: string; status: string; priority: string }>;
  investorRoomSections: Array<{ id: string; title: string; status: string; documents: string[] }>;
  e2eInvestorScore?: number;
  founderReadinessScore?: number;
  networkBenchmarks?: string[];
}
