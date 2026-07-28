/** Program 4250 — Compact Command Center snapshot without full engine orchestration. */

import type { VentureProject } from "@/lib/domain/venture";
import { getVentures } from "@/lib/store/ventures";
import { VANDL_VENTURE, VANDL_VENTURE_ID } from "@/lib/fixtures/vandl-venture";
import { getFounderName } from "@/lib/autonomous-organization";
import { buildPortfolioHealthSnapshot } from "@/lib/health";
import { buildCeoPanel } from "./ceo-panel";
import { buildVenturePanel } from "./venture-panel";
import { buildAiPanelFallback } from "./ai-panel";
import { buildBuildPanelSync } from "./build-panel";
import { COMMAND_CENTER_QUICK_ACTIONS } from "./quick-actions";
import type { CommandCenterSnapshot } from "./types";
import { COMMAND_CENTER_VERSION } from "./types";

function resolveVentures(): VentureProject[] {
  const stored = getVentures();
  if (stored.length > 0) return stored;
  return [VANDL_VENTURE];
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

function buildSelfEvolutionSummary(): CommandCenterSnapshot["selfEvolution"] {
  return {
    improvementsDetected: 0,
    proposals: [],
    aggregateRoi: 0,
    aggregateRisk: "medio",
    healthScore: 0,
    href: "/self-evolution",
  };
}

/** Fast initial snapshot — skips AI runtime, build pipeline async, mesh, marketplace, timeline. */
export function loadCommandCenterSummary(): CommandCenterSnapshot {
  const ventures = resolveVentures();
  const build = buildBuildPanelSync();

  return {
    version: COMMAND_CENTER_VERSION,
    founderName: getFounderName(),
    generatedAt: new Date().toISOString(),
    ceo: buildCeoPanel(ventures),
    priorities: [],
    ventures: buildVenturePanel(ventures),
    mesh: {
      departmentsActive: 0,
      departmentsTotal: 0,
      lastTopic: "Cargando…",
      status: "idle",
      href: "/lab/executive-mesh",
    },
    ai: buildAiPanelFallback(),
    runtime: buildRuntimePanel(ventures),
    tasks: [],
    timeline: [],
    build,
    deployments: [
      { label: "Build Pipeline", status: build.mode, href: "/deployments" },
      { label: "Deploy Preview", status: build.deployPreview, href: "/deployments" },
    ],
    organization: {
      healthScore: 0,
      initiatives: 0,
      departments: 0,
      href: "/organization",
    },
    marketplace: {
      totalPacks: 0,
      featured: 0,
      summary: "Cargando…",
      href: "/marketplace",
    },
    capital: {
      metrics: [],
      href: "/capital",
    },
    notifications: [],
    selfEvolution: buildSelfEvolutionSummary(),
    decisions: [],
    calendar: [],
    quickActions: COMMAND_CENTER_QUICK_ACTIONS,
  };
}
