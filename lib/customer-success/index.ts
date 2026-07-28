/** Program 8000 — Customer Success Platform public API */

export { CUSTOMER_SUCCESS_VERSION } from "./types";
export type * from "./types";

export {
  isCustomerSuccessPlatformEnabled,
  isCustomerSuccessAnalyticsEnabled,
  getCustomerSuccessAnalyticsEndpoint,
} from "./config";

export { getCustomerSuccessSnapshot } from "./customer-success-center";
export { computeSuccessScore } from "./success-score";

export {
  computeCustomerHealth,
  listCustomerHealthScores,
  getCustomerHealth,
  getHealthTierLabel,
} from "./customer-health";

export {
  listNpsResponses,
  submitNpsResponse,
  getNpsScore,
  getNpsBreakdown,
} from "./nps-engine";

export { getRetentionMetrics, computeRetentionRate } from "./retention";
export { getActivationMetrics, computeActivationRate } from "./activation";
export { getExpansionMetrics } from "./expansion";

export { getJourneyAnalytics, getJourneyFunnel, getJourneyProgress, STAGE_LABELS } from "./user-journey-analytics";
export { getConversionFunnels, getPrimaryFunnel } from "./funnels";

export {
  getProductMetrics,
  trackDesignPartnerEvent,
  trackDesignPartnerPageView,
} from "./product-analytics";

export {
  trackSessionPageView,
  endCurrentSession,
  getSessionSummary,
} from "./session-analytics";

export { recordHeatmapClick, getHeatmapZones, getDemoHeatmapStructure } from "./heatmaps";
export { getFeatureAdoptionMetrics } from "./feature-adoption";

export {
  getAiUsageAnalytics,
  getAiUsageSummary,
  listAiRuntimeRecords,
  getAiUsageByTask,
  getAiUsageByProvider,
} from "./ai-usage-analytics";

export {
  listExecutiveReports,
  getLatestExecutiveReport,
  generateExecutiveReport,
} from "./executive-reports";

export {
  getRoadmapFeedbackSummary,
  listRoadmapWithVotes,
  getRoadmapVoteCount,
} from "./roadmap-feedback";

export {
  getIdeasPortalSummary,
  listFeatureRequests,
  getFeatureRequestCount,
  submitFeatureRequest,
  upvoteFeatureRequest,
} from "./ideas-portal";

export { getSupportMetrics } from "./support-metrics";
export { generateExecutiveInsights } from "./executive-insights";

export { listFeedbackInbox, getFeedbackInboxCount } from "@/lib/design-partners/feedback-center";
