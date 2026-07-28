/** Program 4500 — Command Center main orchestrator. */

import type { VentureProject } from "@/lib/domain/venture";
import { getVentures } from "@/lib/store/ventures";
import { VANDL_VENTURE, VANDL_VENTURE_ID } from "@/lib/fixtures/vandl-venture";
import { buildFounderPrioritiesSection, buildFounderCapitalSection } from "@/lib/founder-dashboard";
import { buildPortfolioHealthSnapshot } from "@/lib/health";
import { MESH_DEPARTMENTS } from "@/lib/executive-mesh/departments";
import {
  buildOrganizationSnapshot,
  getExecutiveCalendar,
  getExecutiveInbox,
  getFounderName,
  planExecutivePriorities,
  getActiveInitiatives,
} from "@/lib/autonomous-organization";
import { getCombinedMarketplaceStats } from "@/lib/marketplace";
import { buildCeoPanel } from "./ceo-panel";
import { buildVenturePanel } from "./venture-panel";
import { buildAiPanel, buildAiPanelFallback } from "./ai-panel";
import { buildSelfEvolutionPanel } from "./self-evolution-panel";
import { buildBuildPanelSync, buildBuildPanelAsync } from "./build-panel";
import { buildNotificationsPanel } from "./notifications-panel";
import { buildTimelinePanel } from "./timeline-panel";
import { COMMAND_CENTER_QUICK_ACTIONS } from "./quick-actions";
import type { CommandCenterSnapshot, TaskItem } from "./types";
import { COMMAND_CENTER_VERSION } from "./types";

function resolveVentures(): VentureProject[] {
  const stored = getVentures();
  if (stored.length > 0) return stored;
  return [VANDL_VENTURE];
}

function buildPriorities(ventures: VentureProject[]): TaskItem[] {
  const founder = buildFounderPrioritiesSection(ventures);
  return founder.items.map((item) => ({
    id: item.id,
    label: item.label,
    priority: item.priority,
    href: item.href,
  }));
}

function buildTasks(): TaskItem[] {
  return planExecutivePriorities().slice(0, 6).map((p) => ({
    id: p.id,
    label: p.title,
    priority: p.level,
    href: "/organization",
  }));
}

function buildMeshPanel(): CommandCenterSnapshot["mesh"] {
  const org = buildOrganizationSnapshot();
  return {
    departmentsActive: org.objectives.length,
    departmentsTotal: MESH_DEPARTMENTS.length,
    lastTopic: org.briefing.recommendation,
    status: org.healthScore >= 70 ? "healthy" : "attention",
    href: "/lab/executive-mesh",
  };
}

function buildRuntimePanel(ventures: VentureProject[]): CommandCenterSnapshot["runtime"] {
  const health = buildPortfolioHealthSnapshot(ventures);
  const total = ventures.length || 1;
  const score = Math.round(((health.healthy + health.operating) / total) * 100);
  return {
    score: Math.min(100, score),
    label: score >= 70 ? "Operativo" : "Requiere atención",
    venturesHealthy: health.healthy + health.operating,
    venturesTotal: total,
  };
}

function buildOrganizationPanel(): CommandCenterSnapshot["organization"] {
  const snap = buildOrganizationSnapshot();
  return {
    healthScore: snap.healthScore,
    initiatives: getActiveInitiatives().length,
    departments: MESH_DEPARTMENTS.length,
    href: "/organization",
  };
}

function buildMarketplacePanel(): CommandCenterSnapshot["marketplace"] {
  const stats = getCombinedMarketplaceStats();
  return {
    totalPacks: stats.combined.totalListings,
    featured: stats.combined.featured,
    summary: `${stats.combined.totalListings} listings en el ecosistema`,
    href: "/marketplace",
  };
}

function buildCapitalPanel(ventures: VentureProject[]): CommandCenterSnapshot["capital"] {
  const cap = buildFounderCapitalSection(ventures);
  return {
    metrics: cap.aggregateMetrics.map((m) => ({
      label: m.label,
      value: `${m.score}/${m.maxScore}`,
    })),
    href: "/capital",
  };
}

function buildDecisions(): CommandCenterSnapshot["decisions"] {
  return getExecutiveInbox().slice(0, 6).map((item) => ({
    id: item.id,
    label: item.subject,
    department: item.from,
    relative: item.receivedAt,
  }));
}

function buildCalendar(): CommandCenterSnapshot["calendar"] {
  return getExecutiveCalendar().slice(0, 5).map((e) => ({
    id: e.id,
    title: e.title,
    time: e.start,
  }));
}

export async function runCommandCenterEngine(): Promise<CommandCenterSnapshot> {
  const ventures = resolveVentures();
  const primaryId = ventures[0]?.id ?? VANDL_VENTURE_ID;

  let ai = buildAiPanelFallback();
  try {
    ai = await buildAiPanel();
  } catch {
    ai = buildAiPanelFallback();
  }

  let build = buildBuildPanelSync();
  try {
    build = await buildBuildPanelAsync(primaryId);
  } catch {
    build = buildBuildPanelSync();
  }

  const deployments = [
    { label: "Build Pipeline", status: build.mode, href: "/deployments" },
    { label: "Deploy Preview", status: build.deployPreview, href: "/deployments" },
    { label: "Founder Zero", status: "Validación", href: "/founder-zero" },
  ];

  return {
    version: COMMAND_CENTER_VERSION,
    founderName: getFounderName(),
    generatedAt: new Date().toISOString(),
    ceo: buildCeoPanel(ventures),
    priorities: buildPriorities(ventures),
    ventures: buildVenturePanel(ventures),
    mesh: buildMeshPanel(),
    ai,
    runtime: buildRuntimePanel(ventures),
    tasks: buildTasks(),
    timeline: buildTimelinePanel(ventures),
    build,
    deployments,
    organization: buildOrganizationPanel(),
    marketplace: buildMarketplacePanel(),
    capital: buildCapitalPanel(ventures),
    notifications: buildNotificationsPanel(),
    selfEvolution: buildSelfEvolutionPanel(),
    decisions: buildDecisions(),
    calendar: buildCalendar(),
    quickActions: COMMAND_CENTER_QUICK_ACTIONS,
  };
}

export function runCommandCenterLab(): Promise<CommandCenterSnapshot> {
  return runCommandCenterEngine();
}
