/** RC10 — ForgeOS Network — collective intelligence layer. */

export {
  NETWORK_ENGINE_VERSION,
  createDefaultNetworkContext,
  buildNetworkSnapshot,
  runNetworkEngine,
} from "./network-engine";

export {
  getOrgConsent,
  setConsentScope,
  grantAllConsent,
  revokeAllConsent,
  canContributeToNetwork,
  assertContributionConsent,
  listConsentScopes,
} from "./consent-engine";

export {
  anonymizeValue,
  anonymizeOrgId,
  buildAnonymizedMetric,
  stripPrivateFields,
  buildAnonymizedContribution,
  createDemoAnonymizedSample,
} from "./anonymization-engine";

export {
  containsSensitiveData,
  verifyOrgIsolation,
  enforcePrivacyLayer,
  prepareNetworkContribution,
  getPrivacyChecklist,
} from "./privacy-layer";

export { buildBenchmarks, getSectorBenchmarks, formatBenchmarkDeltaEs } from "./benchmark-engine";
export { buildMarketSignals, getStrongestSignal } from "./signal-engine";
export { buildBestPractices, getTopBestPractice } from "./best-practices-engine";
export { buildMarketTrends, getTopTrend } from "./market-trends-engine";
export { buildOpportunities, getTopOpportunity } from "./opportunity-network";
export {
  buildAnonymousComparisons,
  buildRecommendations,
  buildInsights,
  buildExecutiveSummaryEs,
} from "./network-insights";

export {
  DEMO_DISCLAIMER,
  CONSENT_REQUIRED_MESSAGE,
} from "./types";

export type {
  ConsentScope,
  ConsentStatus,
  OrgConsentRecord,
  AnonymizedMetric,
  BenchmarkMetric,
  BenchmarkResult,
  MarketSignal,
  BestPractice,
  MarketTrend,
  NetworkOpportunity,
  NetworkRecommendation,
  AnonymousComparison,
  NetworkInsight,
  NetworkContext,
  NetworkSnapshot,
  NetworkLabSnapshot,
} from "./types";
