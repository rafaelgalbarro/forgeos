/** Program 5000 — Design Partner Program */

export { DESIGN_PARTNER_VERSION } from "./types";
export type {
  JourneyStage,
  JourneyProgress,
  OrgInvitation,
  WorkspaceInvitation,
  IssueReport,
  IssueSeverity,
  IssueStatus,
  FeatureRequest,
  FeatureRequestStatus,
  FeatureRequestPriority,
  RoadmapVote,
  RoadmapItemWithVotes,
  DesignPartnerAnalyticsEvent,
  DesignPartnerAnalyticsRecord,
  NpsResponse,
  CustomerHealthScore,
  ExecutiveReport,
  SuccessDashboardData,
  DesignPartnerDashboardData,
  FeedbackInboxItem,
} from "./types";

export {
  isDesignPartnerMode,
  isDesignPartnerAnalyticsEnabled,
  getDesignPartnerAnalyticsEndpoint,
} from "./config";

export {
  listOrgInvitations,
  listWorkspaceInvitations,
  getPendingInviteCount,
  createOrgInvitation,
  createWorkspaceInvitation,
  acceptOrgInvitation,
  acceptWorkspaceInvitation,
  listInvitationCodes,
  getInvitationRedemption,
  validateInvitationCode,
  redeemInvitation,
} from "./invitation-system";

export { listFeedbackInbox, getFeedbackInboxCount, getFeedbackInboxBySource } from "./feedback-center";

export { listRoadmapWithVotes, voteForRoadmapItem, getRoadmapVoteCount, removeRoadmapVote } from "./roadmap-voting";

export {
  listIssueReports,
  getIssueCount,
  submitIssueReport,
  updateIssueStatus,
} from "./issue-reporting";

export {
  listFeatureRequests,
  getFeatureRequestCount,
  submitFeatureRequest,
  upvoteFeatureRequest,
  updateFeatureRequestStatus,
} from "./feature-requests";

export {
  listDesignPartnerEvents,
  getDesignPartnerEventCount,
  trackDesignPartnerEvent,
  trackDesignPartnerPageView,
  clearDesignPartnerEvents,
  listAnalyticsEvents,
  getAnalyticsEventCount,
  trackBetaEvent,
  trackBetaPageView,
} from "./analytics";

export {
  getAiUsageSummary,
  listAiRuntimeRecords,
  listExtendedAiRecords,
  getAiUsageByTask,
  getAiUsageByProvider,
} from "./ai-usage-metrics";
export type { AiUsageSummary } from "./ai-usage-metrics";

export {
  listExecutiveReports,
  getLatestExecutiveReport,
  generateExecutiveReport,
} from "./executive-reports";

export {
  computeCustomerHealth,
  listCustomerHealthScores,
  getCustomerHealth,
} from "./customer-health";

export {
  listNpsResponses,
  submitNpsResponse,
  getSuccessDashboardData,
} from "./success-dashboard";

export {
  getJourneyProgress,
  advanceJourneyStage,
  syncJourneyFromContext,
  getJourneyFunnel,
  STAGE_ORDER,
  STAGE_LABELS,
} from "./journey-tracker";

export { getDesignPartnerDashboardData } from "./dashboard";
