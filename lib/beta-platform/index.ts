/** Program 3000 Sprint 6 — Private Beta Platform */

export { BETA_PLATFORM_VERSION } from "./types";
export type {
  WaitlistEntry,
  WaitlistStatus,
  InvitationCode,
  InvitationRedemption,
  BetaFeedbackRecord,
  FeedbackCategory,
  BetaAnalyticsEvent,
  BetaAnalyticsEventRecord,
  CrashReport,
  CrashSeverity,
  FeatureFlag,
  FeatureFlagOverride,
  BetaChangelogEntry,
  BetaAccessStage,
  BetaAccessState,
  BetaDashboardData,
} from "./types";

export {
  isBetaMode,
  isBetaAnalyticsEnabled,
  isCrashReportsEnabled,
  getBetaAnalyticsEndpoint,
} from "./config";

export {
  getWaitlistEntry,
  isOnWaitlist,
  joinWaitlist,
  getQueuePosition,
  markWaitlistInvited,
  markWaitlistRegistered,
  activateWaitlist,
  clearWaitlist,
  estimateWaitDays,
} from "./waitlist";

export {
  listInvitationCodes,
  getInvitationRedemption,
  hasRedeemedInvitation,
  validateInvitationCode,
  redeemInvitation,
  clearInvitationRedemption,
} from "./invitations";

export { listBetaFeedback, submitBetaFeedback, getFeedbackCount } from "./feedback";

export {
  listAnalyticsEvents,
  getAnalyticsEventCount,
  trackBetaEvent,
  trackBetaPageView,
  clearAnalyticsEvents,
} from "./analytics";

export {
  listCrashReports,
  getCrashReportCount,
  submitCrashReport,
  installCrashCapture,
  clearCrashReports,
} from "./crash-reports";

export {
  DEFAULT_FEATURE_FLAGS,
  listFeatureFlags,
  isFeatureEnabled,
  setFeatureFlagOverride,
  getResolvedFlags,
  resetFeatureFlagOverrides,
} from "./feature-flags";

export { BETA_CHANGELOG, getLatestBetaChangelog, getRecentChangelog } from "./changelog";

export { resolveBetaAccess, getBetaDashboardData } from "./beta-dashboard";
