/** RC10 — Market trends engine (demo, anonymized). */

import type { MarketTrend, NetworkContext } from "./types";
import { DEMO_DISCLAIMER } from "./types";

export function buildMarketTrends(ctx: NetworkContext): MarketTrend[] {
  return [
    {
      id: "trend-saas-growth",
      label: "Crecimiento SaaS B2B",
      growthPct: 21,
      horizon: "6 meses",
      sector: ctx.sector,
      relevanceScore: 9.2,
      disclaimer: DEMO_DISCLAIMER,
    },
    {
      id: "trend-ai-copilot",
      label: "Copilotos IA en producto",
      growthPct: 38,
      horizon: "12 meses",
      sector: ctx.sector,
      relevanceScore: 8.7,
      disclaimer: DEMO_DISCLAIMER,
    },
    {
      id: "trend-vertical-saas",
      label: "Verticalización SaaS",
      growthPct: 16,
      horizon: "12 meses",
      sector: ctx.sector,
      relevanceScore: 7.5,
      disclaimer: DEMO_DISCLAIMER,
    },
    {
      id: "trend-plg",
      label: "Product-Led Growth",
      growthPct: 12,
      horizon: "6 meses",
      sector: ctx.sector,
      relevanceScore: 8.1,
      disclaimer: DEMO_DISCLAIMER,
    },
  ];
}

export function getTopTrend(trends: MarketTrend[]): MarketTrend | null {
  if (trends.length === 0) return null;
  return [...trends].sort((a, b) => b.relevanceScore - a.relevanceScore)[0];
}
