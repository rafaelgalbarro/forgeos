import type { VentureProject } from "@/lib/domain/venture";
import {
  runVentureSimulator,
  ventureToSimulatorInput,
} from "@/lib/venture-simulator";
import { buildRecentActivity, buildUpcomingActions } from "./activity-feed";
import { buildCEOBriefing } from "./ceo-briefing";
import {
  countImportantDecisions,
  countStartupsInProgress,
  buildPortfolioMetrics,
} from "./portfolio-metrics";
import {
  getEstimatedTimeForAction,
} from "./impact-engine";
import {
  countPriorityActions,
  formatHeaderNextAction,
  formatNextActionLine,
  resolveNextAction,
  resolvePortfolioNextAction,
  type NextAction,
} from "./next-action";
import { formatRelativeTime } from "./time-utils";
import type {
  DashboardHeaderData,
  PortfolioDashboardData,
  VenturePortfolioCard,
} from "./types";
import {
  buildAITeam,
  buildPipeline,
  deriveCurrentState,
  deriveNextActionLabel,
  formatStartupScore,
  formatVentureScore,
  formatVentureType,
  resolveLifeStage,
  resolveScores,
  resolveStatusBadge,
  ventureHref,
} from "./venture-status";

const USER_NAME = "Rafael";

function missionImpactBullets(action: NextAction): string[] {
  if (action.label.includes("Discovery")) {
    return ["aumenta Startup Score", "reduce riesgo", "desbloquea Research"];
  }
  if (action.label.includes("Research")) {
    return ["reduce incertidumbre", "mejora el análisis", "desbloquea Product"];
  }
  if (action.label.includes("Build")) {
    return ["avanza hacia lanzamiento", "consolida el MVP", "reduce retrabajo"];
  }
  return [action.impact];
}

function buildHeader(ventures: VentureProject[]): DashboardHeaderData {
  const priorityActions = countPriorityActions(ventures);
  const portfolioNext = resolvePortfolioNextAction(ventures);
  const n = countStartupsInProgress(ventures);
  const x = countImportantDecisions(ventures);

  const nextActionLine = portfolioNext
    ? formatHeaderNextAction(portfolioNext)
    : "No hay acciones críticas pendientes";

  return {
    userName: USER_NAME,
    priorityActions,
    startupsInProgress: n,
    importantDecisions: x,
    subtitle:
      "ForgeOS ha revisado tu portfolio y ha encontrado la mejor acción para avanzar hoy.",
    nextActionLine,
    expectedImpact: portfolioNext?.impact ?? "",
    missionLabel: portfolioNext?.label ?? "Sin misión crítica",
    missionVenture: portfolioNext?.ventureName ?? "",
    missionPriority: portfolioNext?.priority ?? null,
    estimatedTime: portfolioNext ? getEstimatedTimeForAction(portfolioNext.label) : "",
    impactBullets: portfolioNext ? missionImpactBullets(portfolioNext) : [],
    continueHref: portfolioNext?.href ?? "/",
    continueLabel: portfolioNext?.label ?? "Crear Empresa",
  };
}

function buildVentureCard(venture: VentureProject): VenturePortfolioCard {
  const scores = resolveScores(venture);
  const sim =
    venture.ventureSimulatorResult ??
    runVentureSimulator(ventureToSimulatorInput(venture));
  const life = resolveLifeStage(venture, scores.ventureScore);
  const badge = resolveStatusBadge(venture);
  const nextActionData = resolveNextAction(venture);

  return {
    id: venture.id,
    name: venture.name,
    shortDescription:
      venture.description?.slice(0, 140) ||
      venture.ideaText.slice(0, 140) + (venture.ideaText.length > 140 ? "…" : ""),
    ventureType: formatVentureType(venture.category),
    lifeStage: life.stage,
    lifeStageLabel: life.label,
    statusBadge: badge.badge,
    statusBadgeLabel: badge.label,
    startupScore: formatStartupScore(scores.startupScore),
    ventureScore: formatVentureScore(scores.ventureScore, scores.hasSimulation),
    confidence: scores.confidence,
    confidenceLabel:
      scores.confidence.charAt(0).toUpperCase() + scores.confidence.slice(1),
    lastUpdated: venture.updatedAt,
    lastUpdatedRelative: formatRelativeTime(venture.updatedAt),
    currentState: deriveCurrentState(venture),
    nextAction: deriveNextActionLabel(venture),
    nextActionData,
    pipeline: buildPipeline(venture, sim?.recommendation),
    aiTeam: buildAITeam(venture),
    href: ventureHref(venture),
  };
}

export function buildPortfolioDashboardData(
  ventures: VentureProject[]
): PortfolioDashboardData {
  const sorted = [...ventures].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  return {
    header: buildHeader(sorted),
    metrics: buildPortfolioMetrics(sorted),
    ceoBriefing: buildCEOBriefing(sorted),
    ventures: sorted.map(buildVentureCard),
    recentActivity: buildRecentActivity(sorted),
    upcomingActions: buildUpcomingActions(sorted),
  };
}

export type {
  ActivityEvent,
  CEOBriefing,
  DashboardHeaderData,
  PipelineStep,
  PortfolioDashboardData,
  PortfolioMetric,
  UpcomingAction,
  VenturePortfolioCard,
} from "./types";

export type { NextAction, NextActionPriority } from "./next-action";

export { buildCEOBriefing } from "./ceo-briefing";
export { buildPortfolioMetrics } from "./portfolio-metrics";
export { buildRecentActivity, buildUpcomingActions } from "./activity-feed";
export { formatRelativeTime } from "./time-utils";
export {
  countPriorityActions,
  formatNextActionLine,
  resolveAllNextActions,
  resolveNextAction,
  resolvePortfolioNextAction,
} from "./next-action";
export {
  buildPortfolioSmartAction,
  buildSmartAction,
  getEstimatedTimeForAction,
} from "./impact-engine";
export type { SmartAction } from "./impact-engine";
export {
  buildPipeline,
  deriveCurrentState,
  deriveNextAction,
  deriveNextActionLabel,
  formatStartupScore,
  formatVentureScore,
} from "./venture-status";
