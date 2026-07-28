import type { DesignPartnerDashboardData } from "./types";
import { isDesignPartnerMode, isDesignPartnerAnalyticsEnabled } from "./config";
import { syncJourneyFromContext } from "./journey-tracker";
import { computeCustomerHealth } from "./customer-health";
import { getSuccessDashboardData } from "./success-dashboard";
import { getFeedbackInboxCount } from "./feedback-center";
import { getIssueCount } from "./issue-reporting";
import { getFeatureRequestCount } from "./feature-requests";
import { getPendingInviteCount } from "./invitation-system";
import { getAiUsageSummary } from "./ai-usage-metrics";
import { getLatestExecutiveReport } from "./executive-reports";

export function getDesignPartnerDashboardData(): DesignPartnerDashboardData {
  return {
    partnerMode: isDesignPartnerMode(),
    analyticsEnabled: isDesignPartnerAnalyticsEnabled(),
    journey: syncJourneyFromContext(),
    health: computeCustomerHealth(),
    success: getSuccessDashboardData(),
    feedbackCount: getFeedbackInboxCount(),
    issueCount: getIssueCount(),
    featureRequestCount: getFeatureRequestCount(),
    pendingInvites: getPendingInviteCount(),
    aiUsage: getAiUsageSummary(),
    recentExecutiveReport: getLatestExecutiveReport(),
  };
}
