/** RC10 — ForgeOS Network orchestrator. */

import type { NetworkContext, NetworkSnapshot } from "./types";
import { DEMO_DISCLAIMER } from "./types";
import { getOrgConsent, canContributeToNetwork } from "./consent-engine";
import { buildBenchmarks } from "./benchmark-engine";
import { buildMarketSignals } from "./signal-engine";
import { buildBestPractices } from "./best-practices-engine";
import { buildMarketTrends } from "./market-trends-engine";
import { buildOpportunities } from "./opportunity-network";
import {
  buildAnonymousComparisons,
  buildRecommendations,
  buildInsights,
  buildExecutiveSummaryEs,
} from "./network-insights";
import { enforcePrivacyLayer } from "./privacy-layer";

export const NETWORK_ENGINE_VERSION = "RC10.0.0";

export function createDefaultNetworkContext(
  overrides: Partial<NetworkContext> = {}
): NetworkContext {
  return {
    organizationId: "demo-org-forgeos",
    ventureId: "lab-mock-venture-1",
    sector: "saas",
    ventureName: "FleetPulse Lab",
    monthlyRevenue: 4200,
    pricingPlanEur: 29,
    mrrGrowthPct: 12,
    ...overrides,
  };
}

export function buildNetworkSnapshot(ctx: NetworkContext): NetworkSnapshot {
  const consent = getOrgConsent(ctx.organizationId);
  const benchmarks = buildBenchmarks(ctx);
  const signals = buildMarketSignals(ctx);
  const bestPractices = buildBestPractices(ctx);
  const trends = buildMarketTrends(ctx);
  const opportunities = buildOpportunities(ctx);
  const recommendations = buildRecommendations(ctx, benchmarks);
  const comparisons = buildAnonymousComparisons(ctx, benchmarks);
  const insights = buildInsights(ctx, benchmarks, recommendations);

  enforcePrivacyLayer(ctx);

  return {
    organizationId: ctx.organizationId,
    ventureId: ctx.ventureId,
    generatedAt: new Date().toISOString(),
    dryRunOnly: true,
    disclaimer: DEMO_DISCLAIMER,
    consent,
    canContribute: canContributeToNetwork(ctx.organizationId),
    benchmarks,
    signals,
    bestPractices,
    trends,
    opportunities,
    recommendations,
    comparisons,
    insights,
    executiveSummaryEs: buildExecutiveSummaryEs(ctx, benchmarks, recommendations),
  };
}

export function runNetworkEngine(
  ctx: NetworkContext = createDefaultNetworkContext()
): NetworkSnapshot {
  return buildNetworkSnapshot(ctx);
}
