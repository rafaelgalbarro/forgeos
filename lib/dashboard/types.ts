import type { ConfidenceLevel } from "@/lib/venture-simulator";

export type PipelineStepId =
  | "discovery"
  | "research"
  | "product"
  | "ux"
  | "architecture"
  | "build"
  | "launch";

export type PipelineStepStatus = "pending" | "active" | "complete";

export interface PipelineStep {
  id: PipelineStepId;
  label: string;
  status: PipelineStepStatus;
}

export type VentureGeneralStatus =
  | "evaluando"
  | "construyendo"
  | "mvp"
  | "produccion"
  | "pausada";

export interface PortfolioSummaryMetrics {
  totalEmpresas: number;
  mvpsActivos: number;
  produccion: number;
  horasAhorradas: number;
}

export interface PortfolioVentureCard {
  id: string;
  name: string;
  shortDescription: string;
  generalStatus: VentureGeneralStatus;
  generalStatusLabel: string;
  startupScore: number;
  ventureScore: number;
  confidence: ConfidenceLevel;
  confidenceLabel: string;
  lastUpdated: string;
  lastUpdatedRelative: string;
  nextAction: string;
  pipeline: PipelineStep[];
  href: string;
  category: string;
}

export interface CEORecommendationItem {
  id: string;
  ventureId?: string;
  ventureName?: string;
  message: string;
  priority: "high" | "medium" | "low";
}

export interface CEOBrief {
  subtitle: string;
  recommendations: CEORecommendationItem[];
  fullReportLines: string[];
}

export type ActivityEventType =
  | "research"
  | "product"
  | "discovery"
  | "build_plan"
  | "export"
  | "simulator"
  | "build"
  | "venture";

export interface ActivityEvent {
  id: string;
  ventureId: string;
  ventureName: string;
  type: ActivityEventType;
  label: string;
  timestamp: string;
  relative: string;
}

export interface DashboardData {
  summary: PortfolioSummaryMetrics;
  ceoBrief: CEOBrief;
  ventures: PortfolioVentureCard[];
  activity: ActivityEvent[];
}
