/** Thin adapter — Agents Marketplace public API (Program 4700). */

import type { MarketingSnapshot, SEOSnapshot } from "../types";

export async function fetchMarketingSnapshot(missionMarketingProgress?: number): Promise<MarketingSnapshot> {
  const { buildMarketplaceCatalog } = await import("@/lib/agents-marketplace");
  const catalog = buildMarketplaceCatalog({ department: "Marketing" });
  const marketingAgents = catalog.agents.filter(
    (a) => a.department === "Marketing" || a.tags.includes("marketing")
  );

  const progress = missionMarketingProgress ?? 0;
  const status = progress >= 80 ? "active" : progress >= 40 ? "planning" : "draft";

  return {
    headline: progress > 0 ? `Marketing al ${progress}%` : "Marketing — listo para activar",
    campaigns: [
      {
        id: "camp-launch",
        name: "Lanzamiento producto",
        status,
        reach: progress > 0 ? Math.round(progress * 120) : undefined,
      },
      {
        id: "camp-brand",
        name: "Brand awareness",
        status: progress >= 50 ? "active" : "draft",
      },
    ],
    channels: ["Email", "Social", "Content", "SEO"],
    engagementRate: progress > 0 ? Math.round(progress * 0.8) / 100 : undefined,
    agentCount: marketingAgents.length,
  };
}

export async function fetchSeoSnapshot(): Promise<SEOSnapshot> {
  const { buildMarketplaceCatalog } = await import("@/lib/agents-marketplace");
  const catalog = buildMarketplaceCatalog({ tag: "seo" });
  const seoAgents = catalog.agents.filter((a) => a.tags.includes("seo") || a.slug === "seo");

  return {
    score: seoAgents.length > 0 ? 72 : 45,
    keywords: ["forgeos", "app factory", "autonomous company", "mission control"],
    indexedPages: 12,
    topQueries: [
      { query: "forgeos mission control", impressions: 340 },
      { query: "autonomous app factory", impressions: 210 },
      { query: "ai venture builder", impressions: 155 },
    ],
    strategyNote:
      seoAgents.length > 0
        ? `${seoAgents.length} agente(s) SEO disponibles en marketplace`
        : "Conecta agentes SEO desde el marketplace para métricas en vivo",
  };
}

export async function fetchMarketplaceAgentCount(): Promise<number> {
  const { buildMarketplaceCatalog } = await import("@/lib/agents-marketplace");
  return buildMarketplaceCatalog().agents.length;
}
