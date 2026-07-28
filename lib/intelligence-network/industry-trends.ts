/** Program 9000 — Industry trends stub. */

import { buildMarketTrends, getTopTrend } from "@/lib/network/market-trends-engine";
import type { IndustryTrend } from "./types";
import type { NetworkContext } from "@/lib/network/types";
import { DEMO_DISCLAIMER } from "@/lib/network/types";

export { getTopTrend };

export function buildIndustryTrends(ctx: NetworkContext): IndustryTrend[] {
  const base = buildMarketTrends(ctx);
  return base.map((t, i) => ({
    ...t,
    momentum: t.growthPct > 20 ? ("rising" as const) : t.growthPct > 10 ? ("stable" as const) : ("cooling" as const),
    sourceCount: 12 + i * 3,
    disclaimer: DEMO_DISCLAIMER,
  }));
}

export function getTopIndustryTrend(trends: IndustryTrend[]): IndustryTrend | null {
  if (trends.length === 0) return null;
  return [...trends].sort((a, b) => b.relevanceScore - a.relevanceScore)[0];
}
