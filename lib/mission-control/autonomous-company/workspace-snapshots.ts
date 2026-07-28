/** Lightweight workspace snapshot builder — adapters loaded on demand. */

import type { MissionPhase } from "../types";
import type { CompanyWorkspaceId, CompanyWorkspacesSnapshot, WorkspacePanelData } from "./types";
import { AUTONOMOUS_COMPANY_VERSION } from "./types";
import { listWorkspaceIds } from "./company-workspaces";
import { seedDemoBacklog, seedDemoRoadmap } from "./mission-local-storage";

function emptyPanels(): Record<CompanyWorkspaceId, WorkspacePanelData> {
  const panels = {} as Record<CompanyWorkspaceId, WorkspacePanelData>;
  for (const id of listWorkspaceIds()) {
    panels[id] = { loaded: false, summary: "Pendiente de cargar", empty: true };
  }
  return panels;
}

/** SSR-safe seed — no heavy engine imports. */
export function buildCompanyWorkspacesSeed(
  missionId = "seed",
  phase: MissionPhase = "OPERATE"
): CompanyWorkspacesSnapshot {
  const panels = emptyPanels();
  for (const id of listWorkspaceIds()) {
    panels[id] = { loaded: true, summary: "Datos demo — carga completa en cliente", empty: false };
  }
  return {
    version: AUTONOMOUS_COMPANY_VERSION,
    generatedAt: new Date().toISOString(),
    missionId,
    phase,
    active: true,
    marketing: {
      headline: "Marketing — demo",
      campaigns: [{ id: "demo", name: "Campaña demo", status: "draft" }],
      channels: ["Email", "Social"],
      agentCount: 0,
    },
    seo: {
      score: 45,
      keywords: ["forgeos"],
      indexedPages: 0,
      topQueries: [],
      strategyNote: "Conecta agentes SEO para métricas en vivo",
    },
    roadmap: seedDemoRoadmap(missionId),
    feedback: [],
    nps: { score: 0, promoters: 0, passives: 0, detractors: 0, responseCount: 0 },
    kpis: [],
    productMetrics: { totalEvents: 0, dpEventCount: 0, betaEventCount: 0, topPaths: [], topEvents: [] },
    backlog: seedDemoBacklog(missionId),
    incidents: [],
    panels,
  };
}

function panelSummary(id: CompanyWorkspaceId, count: number, label: string): WorkspacePanelData {
  return {
    loaded: true,
    summary: count > 0 ? `${count} ${label}` : `Sin ${label}`,
    empty: count === 0,
  };
}

/** Client-side full snapshot — dynamic adapter imports. */
export async function buildCompanyWorkspacesSnapshot(
  missionId: string,
  phase: MissionPhase,
  marketingProgress?: number
): Promise<CompanyWorkspacesSnapshot> {
  const panels = emptyPanels();

  const [
    marketingMod,
    seoMod,
    csMod,
    prodMod,
    roadmapFeedback,
    backlog,
    roadmapLocal,
  ] = await Promise.all([
    import("./adapters/marketplace-adapter"),
    import("./adapters/marketplace-adapter"),
    import("./adapters/customer-success-adapter"),
    import("./adapters/production-adapter"),
    import("./adapters/customer-success-adapter").then((m) => m.fetchRoadmapFromFeedback()),
    Promise.resolve(seedDemoBacklog(missionId)),
    Promise.resolve(seedDemoRoadmap(missionId)),
  ]);

  const [marketing, seo, feedback, nps, kpis, productMetrics, incidents] = await Promise.all([
    marketingMod.fetchMarketingSnapshot(marketingProgress),
    seoMod.fetchSeoSnapshot(),
    csMod.fetchFeedbackSnapshot(),
    csMod.fetchNpsSnapshot(),
    csMod.fetchKpiSnapshot(),
    csMod.fetchProductMetricsSnapshot(),
    prodMod.fetchIncidentsSnapshot(),
  ]);

  const roadmap = roadmapFeedback.length > 0 ? roadmapFeedback : roadmapLocal;

  panels.marketing = panelSummary("marketing", marketing.campaigns.length, "campañas");
  panels.seo = { loaded: true, summary: `Score SEO ${seo.score}`, empty: seo.score === 0 };
  panels.roadmap = panelSummary("roadmap", roadmap.length, "items");
  panels.customerFeedback = panelSummary("customerFeedback", feedback.length, "entradas");
  panels.nps = { loaded: true, summary: `NPS ${nps.score}`, empty: nps.responseCount === 0 };
  panels.kpis = panelSummary("kpis", kpis.length, "KPIs");
  panels.productMetrics = {
    loaded: true,
    summary: `${productMetrics.totalEvents} eventos`,
    empty: productMetrics.totalEvents === 0,
  };
  panels.backlog = panelSummary("backlog", backlog.length, "items");
  panels.incidents = panelSummary("incidents", incidents.length, "incidentes");

  return {
    version: AUTONOMOUS_COMPANY_VERSION,
    generatedAt: new Date().toISOString(),
    missionId,
    phase,
    active: true,
    marketing,
    seo,
    roadmap,
    feedback,
    nps,
    kpis,
    productMetrics,
    backlog,
    incidents,
    panels,
  };
}
