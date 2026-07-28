import type { ConfidenceLevel } from "@/lib/venture-simulator";
import type { NextAction } from "./next-action";

export type PipelineStepId =
  | "discovery"
  | "research"
  | "product"
  | "ux"
  | "architecture"
  | "build"
  | "launch";

export type PipelineStepStatus = "complete" | "active" | "pending" | "blocked";

export interface PipelineStep {
  id: PipelineStepId;
  label: string;
  status: PipelineStepStatus;
}

export type VentureLifeStage =
  | "idea"
  | "validando"
  | "construyendo"
  | "operando"
  | "escalando";

export type VentureStatusBadge = "idea" | "validando" | "build" | "launch" | "operando";

export interface ScoreDisplay {
  value: number | null;
  label: string;
  display: string;
  pending: boolean;
}

export interface AITeamMember {
  role: string;
  status: "listo" | "pendiente" | "revisando" | "en-progreso" | "bloqueado";
  statusLabel: string;
}

export interface PortfolioMetric {
  id: string;
  title: string;
  value: string;
  explanation: string;
  trend?: string;
  pending?: boolean;
  microcopy?: string;
}

export interface VenturePortfolioCard {
  id: string;
  name: string;
  shortDescription: string;
  ventureType: string;
  lifeStage: VentureLifeStage;
  lifeStageLabel: string;
  statusBadge: VentureStatusBadge;
  statusBadgeLabel: string;
  startupScore: ScoreDisplay;
  ventureScore: ScoreDisplay;
  confidence: ConfidenceLevel;
  confidenceLabel: string;
  lastUpdated: string;
  lastUpdatedRelative: string;
  currentState: string;
  nextAction: string;
  nextActionData: NextAction;
  pipeline: PipelineStep[];
  aiTeam: AITeamMember[];
  href: string;
}

export interface CEOBriefing {
  greeting: string;
  openingLine: string;
  observation: string;
  criticalRisk: string;
  recommendation: string;
  expectedImpact: string;
  ctaLabel: string;
  ctaHref: string;
  importantDecisions: number;
  hasEnoughData: boolean;
}

import type { NextActionPriority } from "./next-action";

export interface DashboardHeaderData {
  userName: string;
  subtitle: string;
  nextActionLine: string;
  expectedImpact: string;
  missionLabel: string;
  missionVenture: string;
  missionPriority: NextActionPriority | null;
  estimatedTime: string;
  impactBullets: string[];
  continueHref: string;
  continueLabel: string;
  priorityActions: number;
  startupsInProgress: number;
  importantDecisions: number;
}

export type ActivityEventType =
  | "ceo"
  | "discovery"
  | "simulator"
  | "build_plan"
  | "export"
  | "research"
  | "product"
  | "venture";

export interface ActivityEvent {
  id: string;
  ventureId?: string;
  ventureName?: string;
  type: ActivityEventType;
  label: string;
  timestamp: string;
  relative: string;
}

export interface UpcomingAction {
  id: string;
  label: string;
  ventureName?: string;
  impact: string;
  estimatedTime: string;
  priority: "alta" | "media" | "baja";
  href: string;
}

export interface PortfolioDashboardData {
  header: DashboardHeaderData;
  metrics: PortfolioMetric[];
  ceoBriefing: CEOBriefing;
  ventures: VenturePortfolioCard[];
  recentActivity: ActivityEvent[];
  upcomingActions: UpcomingAction[];
}
