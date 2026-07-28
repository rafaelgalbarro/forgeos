/** Program 6000 — Commercial Readiness layer */

export { COMMERCIAL_VERSION } from "./types";
export type * from "./types";

export {
  isCommercialMode,
  isStripeBillingEnabled,
  isEmailSendingEnabled,
  getStripePublishableKey,
  COMMERCIAL_STORAGE_KEYS,
  DEFAULT_CURRENCY,
} from "./config";

export {
  COMMERCIAL_PLANS,
  FEATURE_MATRIX,
  getPlan,
  listPlans,
  getFeatureMatrix,
  formatPlanPrice,
} from "./plans";

export {
  COMMERCIAL_PLANS as PRICING_PLANS,
  quotePlan,
  comparePlans,
  getRecommendedPlan,
  annualSavingsPercent,
} from "./pricing-engine";

export {
  getActiveOrgId,
  setActiveOrgId,
  getSubscription,
  ensureSubscription,
  updateSubscription,
  cancelSubscription,
  changeSubscriptionPlan,
  listSubscriptions,
} from "./subscriptions";

export { createCheckoutSession, createBillingPortalSession, getStripeMode } from "./stripe-adapter";
export { listInvoices, createInvoice, ensureDemoInvoices } from "./invoices";
export { getOrgLicense, canAddSeat, planIncludesFeature } from "./licenses";
export { getBillingPortalData, getUpgradeOptions, getDowngradeOptions } from "./billing-portal";
export { getUsageSummary, incrementUsage, isWithinLimit, getPlanLimits } from "./usage-metering";
export {
  COMMERCIAL_FEATURE_FLAGS,
  isCommercialFeatureEnabled,
  listCommercialFeatures,
  getRequiredPlan,
} from "./feature-flags";
export { requestUpgrade, canUpgradeTo } from "./upgrade-flow";
export { requestDowngrade, canDowngradeTo } from "./downgrade-flow";
export { startTrial, getTrialDaysRemaining, isTrialActive, endTrial } from "./trial";
export { listCoupons, validateCoupon, redeemCoupon } from "./coupons";
export { getEmailTemplate, sendCommercialEmail } from "./emails";
export { listBillingNotifications, pushBillingNotification, unreadNotificationCount } from "./notifications";
export { PUBLIC_API_VERSION, PUBLIC_API_ENDPOINTS } from "./public-api";
export type { PublicApiPlan, PublicApiSubscription, PublicApiUsage } from "./public-api";
export { listCommercialApiKeys, createCommercialApiKey, revokeCommercialApiKey } from "./api-keys";
export { listCommercialWebhooks, registerWebhook, disableWebhook, WEBHOOK_EVENTS } from "./webhooks";
export { appendCommercialAudit, listCommercialAudit } from "./audit-logs";
export { computeAdminMetrics } from "./admin-metrics";
export { LEGAL_DOCUMENTS, listLegalDocuments, getLegalDocument } from "./legal";
export { KNOWLEDGE_BASE_ARTICLES, listKnowledgeBaseArticles, searchKnowledgeBase } from "./knowledge-base";
export { getDocsPortalSections, getAllDocsArticles, getDocsPortalStats, COMMERCIAL_DOC_SECTIONS } from "./docs-portal";
