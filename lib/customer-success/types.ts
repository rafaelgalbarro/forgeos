/** Program 8000 — Customer Success Platform types */

import type {
  CustomerHealthScore,
  ExecutiveReport,
  JourneyStage,
  NpsResponse,
  SuccessDashboardData,
} from "@/lib/design-partners/types";

export const CUSTOMER_SUCCESS_VERSION = "8000.0.0";

export type { CustomerHealthScore, ExecutiveReport, JourneyStage, NpsResponse, SuccessDashboardData };

export interface CustomerSuccessSnapshot {
  version: string;
  platformEnabled: boolean;
  analyticsEnabled: boolean;
  successScore: number;
  health: CustomerHealthScore | null;
  nps: SuccessDashboardData["nps"];
  retention: SuccessDashboardData["retention"];
  activation: SuccessDashboardData["activation"];
  expansion: ExpansionMetrics;
  journeyFunnel: SuccessDashboardData["journeyFunnel"];
  feedbackCount: number;
  featureRequestCount: number;
  issueCount: number;
  aiUsage: {
    requestCount: number;
    totalTokens: number;
    totalCostUsd: number;
    avgLatencyMs: number;
  };
  latestExecutiveReport: ExecutiveReport | null;
}

export interface ExpansionMetrics {
  rate: number;
  upgradedWorkspaces: number;
  totalWorkspaces: number;
  upsellSignals: number;
}

export interface FunnelStep {
  id: string;
  label: string;
  count: number;
  conversionRate: number;
}

export interface FeatureAdoptionMetric {
  feature: string;
  adopters: number;
  totalUsers: number;
  adoptionRate: number;
  trend: "up" | "down" | "stable";
}

export interface SessionSummary {
  sessionCount: number;
  avgDurationMinutes: number;
  bounceRate: number;
  pagesPerSession: number;
}

export interface HeatmapZone {
  id: string;
  page: string;
  zone: string;
  clicks: number;
  intensity: number;
}

export interface SupportMetrics {
  openTickets: number;
  resolvedTickets: number;
  avgResolutionHours: number;
  satisfactionScore: number;
}

export interface ExecutiveInsight {
  id: string;
  category: "growth" | "retention" | "product" | "ai" | "support";
  title: string;
  summary: string;
  priority: "high" | "medium" | "low";
  metric?: string;
  recommendation: string;
}

export interface RoadmapFeedbackSummary {
  totalVotes: number;
  topItems: Array<{ id: string; title: string; votes: number; quarter: string }>;
}

export interface IdeasPortalSummary {
  totalIdeas: number;
  submitted: number;
  planned: number;
  shipped: number;
  topIdeas: Array<{ id: string; title: string; votes: number; status: string }>;
}
