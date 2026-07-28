import type { CustomerSuccessSnapshot } from "./types";
import { CUSTOMER_SUCCESS_VERSION } from "./types";
import {
  isCustomerSuccessPlatformEnabled,
  isCustomerSuccessAnalyticsEnabled,
} from "./config";
import { getSuccessDashboardData } from "@/lib/design-partners/success-dashboard";
import { computeCustomerHealth } from "./customer-health";
import { computeSuccessScore } from "./success-score";
import { getExpansionMetrics } from "./expansion";
import { getAiUsageSummary } from "./ai-usage-analytics";
import { getLatestExecutiveReport } from "./executive-reports";
import { getFeedbackInboxCount } from "@/lib/design-partners/feedback-center";
import { getFeatureRequestCount } from "@/lib/design-partners/feature-requests";
import { getIssueCount } from "@/lib/design-partners/issue-reporting";

export function getCustomerSuccessSnapshot(): CustomerSuccessSnapshot {
  const success = getSuccessDashboardData();
  const health = computeCustomerHealth();

  return {
    version: CUSTOMER_SUCCESS_VERSION,
    platformEnabled: isCustomerSuccessPlatformEnabled(),
    analyticsEnabled: isCustomerSuccessAnalyticsEnabled(),
    successScore: computeSuccessScore(health),
    health,
    nps: success.nps,
    retention: success.retention,
    activation: success.activation,
    expansion: getExpansionMetrics(),
    journeyFunnel: success.journeyFunnel,
    feedbackCount: getFeedbackInboxCount(),
    featureRequestCount: getFeatureRequestCount(),
    issueCount: getIssueCount(),
    aiUsage: getAiUsageSummary(),
    latestExecutiveReport: getLatestExecutiveReport(),
  };
}
