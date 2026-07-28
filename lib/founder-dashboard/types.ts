import type { PortfolioMetric } from "@/lib/portfolio/types";

export interface FounderDashboardHeader {
  userName: string;
  kicker: string;
  title: string;
  subtitle: string;
  ventureCount: number;
  priorityCount: number;
}

export interface FounderCeoSection {
  greeting: string;
  summary: string;
  observation: string;
  criticalRisk: string;
  recommendation: string;
  expectedImpact: string;
  opportunity: string;
  ctaLabel: string;
  ctaHref: string;
  hasEnoughData: boolean;
}

export interface FounderVentureCard {
  id: string;
  name: string;
  shortDescription: string;
  ventureType: string;
  lifeStageLabel: string;
  statusLabel: string;
  startupScore: string;
  ventureScore: string;
  lastUpdatedRelative: string;
  nextAction: string;
  href: string;
}

export interface FounderEmpresasSection {
  ventures: FounderVentureCard[];
  emptyMessage: string;
}

export interface FounderPriorityItem {
  id: string;
  label: string;
  rationale: string;
  ventureName?: string;
  priority: "alta" | "media" | "baja";
  href: string;
  estimatedTime: string;
}

export interface FounderPrioritiesSection {
  items: FounderPriorityItem[];
  headline: string;
}

export interface FounderPortfolioSection {
  metrics: PortfolioMetric[];
  summary: string;
}

export interface FounderBuildItem {
  id: string;
  ventureName: string;
  phaseLabel: string;
  progressPercent: number;
  statusMessage: string;
  nextMilestone: string;
  href: string;
}

export interface FounderBuildSection {
  items: FounderBuildItem[];
  headline: string;
}

export interface FounderCapitalMetric {
  id: string;
  label: string;
  score: number;
  maxScore: number;
  status: "ready" | "progress" | "pending";
  detail: string;
}

export interface FounderCapitalVenture {
  id: string;
  name: string;
  overallScore: number;
  overallLabel: string;
  href: string;
}

export interface FounderCapitalSection {
  portfolioScore: number;
  portfolioLabel: string;
  aggregateMetrics: FounderCapitalMetric[];
  ventures: FounderCapitalVenture[];
  headline: string;
}

export interface FounderCalendarItem {
  id: string;
  timeLabel: string;
  title: string;
  description: string;
  priority: "alta" | "media" | "baja";
  href?: string;
  ventureName?: string;
}

export interface FounderCalendarSection {
  items: FounderCalendarItem[];
  dateLabel: string;
}

export interface FounderActivityItem {
  id: string;
  label: string;
  ventureName?: string;
  category: string;
  relative: string;
  href?: string;
}

export interface FounderActivitySection {
  items: FounderActivityItem[];
  upcomingCount: number;
}

export interface FounderDashboardData {
  generatedAt: string;
  header: FounderDashboardHeader;
  ceo: FounderCeoSection;
  empresas: FounderEmpresasSection;
  prioridades: FounderPrioritiesSection;
  portfolio: FounderPortfolioSection;
  build: FounderBuildSection;
  capital: FounderCapitalSection;
  calendario: FounderCalendarSection;
  actividad: FounderActivitySection;
}
