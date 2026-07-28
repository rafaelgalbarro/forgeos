/** Program 9000 — Main intelligence network aggregator snapshot. */

import { createDefaultNetworkContext } from "@/lib/network/network-engine";
import { buildInsights, buildExecutiveSummaryEs } from "@/lib/network/network-insights";
import { getPrivacyChecklist } from "@/lib/network/privacy-layer";
import type { IntelligenceNetworkSnapshot, WorkspaceContext } from "./types";
import {
  INTELLIGENCE_NETWORK_VERSION,
  DEMO_DISCLAIMER,
  PRIVACY_DISCLAIMER_ES,
} from "./types";
import { isIntelligenceNetworkEnabled } from "./config";
import { getWorkspaceConsent, canContributeFromWorkspace } from "./consent-engine";
import { createWorkspaceContext } from "./workspace-isolation";
import { enforceOrganizationIsolation } from "./organization-isolation";
import { runGdprComplianceCheck } from "./gdpr-policy";
import { buildIntelligenceBenchmarks } from "./benchmark-engine";
import { buildAggregatedMarketSignals } from "./market-signals";
import { buildIndustryTrends } from "./industry-trends";
import { collectAnonymousMetrics } from "./anonymous-metrics";
import { detectNetworkPatterns } from "./pattern-recognition";
import { buildPlaybookLibrary } from "./playbook-library";
import { buildNetworkBestPractices } from "./best-practices";
import { buildFederatedKnowledgeRefs } from "./knowledge-federation";
import { buildExecutiveInsights } from "./executive-insights";
import { buildAiRecommendations } from "./ai-recommendations";
import { detectOpportunities } from "./opportunity-detection";
import { buildSectorAnalysis } from "./sector-analysis";
import { buildGrowthSignals } from "./growth-signals";
import { buildNetworkDashboard } from "./network-dashboard";

export function createDefaultIntelligenceContext(
  overrides: Partial<WorkspaceContext> = {}
): WorkspaceContext {
  const base = createDefaultNetworkContext(overrides);
  return createWorkspaceContext({
    ...base,
    workspaceId: overrides.workspaceId ?? "default-workspace",
    ...overrides,
  });
}

export function buildIntelligenceSnapshot(
  ctx: WorkspaceContext = createDefaultIntelligenceContext()
): IntelligenceNetworkSnapshot {
  const consent = getWorkspaceConsent(ctx.organizationId, ctx.workspaceId);
  const benchmarks = buildIntelligenceBenchmarks(ctx);
  const marketSignals = buildAggregatedMarketSignals(ctx);
  const industryTrends = buildIndustryTrends(ctx);
  const anonymousMetrics = collectAnonymousMetrics(ctx);
  const patterns = detectNetworkPatterns(ctx, benchmarks);
  const playbooks = buildPlaybookLibrary(ctx);
  const bestPractices = buildNetworkBestPractices(ctx);
  const knowledgeRefs = buildFederatedKnowledgeRefs(ctx);
  const aiRecommendations = buildAiRecommendations(ctx, benchmarks);
  const opportunities = detectOpportunities(ctx);
  const sectorAnalysis = buildSectorAnalysis(ctx);
  const growthSignals = buildGrowthSignals(ctx, benchmarks);
  const insights = buildInsights(ctx, benchmarks, aiRecommendations);
  const executiveInsights = buildExecutiveInsights(ctx, benchmarks, aiRecommendations);

  const gdpr = runGdprComplianceCheck(consent);
  const privacyChecks = [
    ...getPrivacyChecklist(),
    ...enforceOrganizationIsolation(ctx),
    ...gdpr.checks.filter((c) => c.passed).map((c) => c.label),
  ];

  const partial: IntelligenceNetworkSnapshot = {
    programId: "9000",
    version: INTELLIGENCE_NETWORK_VERSION,
    organizationId: ctx.organizationId,
    workspaceId: ctx.workspaceId,
    ventureId: ctx.ventureId,
    generatedAt: new Date().toISOString(),
    dryRunOnly: true,
    disclaimer: DEMO_DISCLAIMER,
    privacyDisclaimer: PRIVACY_DISCLAIMER_ES,
    consent,
    canContribute: canContributeFromWorkspace(ctx.organizationId, ctx.workspaceId),
    networkEnabled: isIntelligenceNetworkEnabled() || true,
    benchmarks,
    marketSignals,
    industryTrends,
    anonymousMetrics,
    patterns,
    playbooks,
    bestPractices,
    knowledgeRefs,
    executiveInsights,
    aiRecommendations,
    opportunities,
    sectorAnalysis,
    growthSignals,
    insights,
    privacyChecks,
    executiveSummaryEs: buildExecutiveSummaryEs(ctx, benchmarks, aiRecommendations),
    dashboard: { kpis: [], sections: [], privacyStatus: "isolated", disclaimer: DEMO_DISCLAIMER },
  };

  partial.dashboard = buildNetworkDashboard(partial);
  return partial;
}

export function runIntelligenceNetwork(
  ctx: WorkspaceContext = createDefaultIntelligenceContext()
): IntelligenceNetworkSnapshot {
  return buildIntelligenceSnapshot(ctx);
}
