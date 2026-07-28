/** Program 9000 — FORGEOS Intelligence Network public API. */

export {
  INTELLIGENCE_NETWORK_VERSION,
  PRIVACY_DISCLAIMER_ES,
  DEMO_DISCLAIMER,
} from "./types";

export type {
  ConsentScope,
  ConsentStatus,
  WorkspaceContext,
  IntelligenceConsentRecord,
  IntelligenceNetworkSnapshot,
  IndustryTrend,
  GrowthSignal,
  DetectedPattern,
  PlaybookEntry,
  FederatedKnowledgeRef,
  ExecutiveInsight,
  AiRecommendation,
  SectorAnalysis,
  OpportunitySignal,
  NetworkDashboardData,
} from "./types";

export {
  INTELLIGENCE_NETWORK_STORAGE_KEYS,
  isIntelligenceNetworkEnabled,
  isNetworkConsentRequired,
  isAnonymizedBenchmarksEnabled,
  getIntelligenceNetworkVersion,
} from "./config";

export {
  createDefaultIntelligenceContext,
  buildIntelligenceSnapshot,
  runIntelligenceNetwork,
} from "./network-intelligence";

export {
  buildIntelligenceBenchmarks,
  getSectorBenchmarks,
  formatBenchmarkDeltaEs,
} from "./benchmark-engine";

export { buildAggregatedMarketSignals, summarizeMarketSignals } from "./market-signals";
export { buildIndustryTrends, getTopIndustryTrend } from "./industry-trends";
export { collectAnonymousMetrics, summarizeAnonymousMetrics } from "./anonymous-metrics";
export { detectNetworkPatterns, getTopPattern } from "./pattern-recognition";
export { buildPlaybookLibrary, getPlaybookById, filterPlaybooksByCategory } from "./playbook-library";
export { buildNetworkBestPractices, summarizeBestPractices } from "./best-practices";
export { buildFederatedKnowledgeRefs, getTopKnowledgeRef } from "./knowledge-federation";
export { buildExecutiveInsights, buildExecutiveSummaryFromInsights } from "./executive-insights";
export { buildAiRecommendations, getRecommendationSourceLabel } from "./ai-recommendations";
export { detectOpportunities, getTopOpportunity } from "./opportunity-detection";
export { buildSectorAnalysis, formatSectorRiskEs } from "./sector-analysis";
export { buildGrowthSignals, getStrongestGrowthSignal } from "./growth-signals";
export { buildNetworkDashboard } from "./network-dashboard";

export {
  getWorkspaceConsent,
  setWorkspaceConsentScope,
  grantWorkspaceConsent,
  revokeWorkspaceConsent,
  canContributeFromWorkspace,
  assertWorkspaceContributionConsent,
  listConsentScopes,
} from "./consent-engine";

export {
  sanitizeForNetwork,
  buildAnonymousMetrics,
  assertAnonymizedOnly,
  prepareAnonymizedContribution,
} from "./anonymization";

export {
  assertWorkspaceBoundary,
  filterByWorkspace,
  createWorkspaceContext,
  enforceWorkspaceIsolation,
} from "./workspace-isolation";

export {
  assertOrgBoundary,
  enforceOrganizationIsolation,
  canAccessOrgData,
} from "./organization-isolation";

export { runGdprComplianceCheck, getGdprRightsEs } from "./gdpr-policy";
export { evaluateEnterprisePolicies, getEnterprisePolicySummaryEs } from "./enterprise-policies";
