/** Program 6000 — Commercial readiness types */

export type CommercialPlanId = "starter" | "pro" | "business" | "enterprise";

export type SubscriptionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "paused";

export type InvoiceStatus = "draft" | "open" | "paid" | "void" | "uncollectible";

export type BillingInterval = "monthly" | "annual";

export interface CommercialPlan {
  id: CommercialPlanId;
  name: string;
  tagline: string;
  monthlyPrice: number;
  annualPrice: number;
  currency: string;
  seats: number;
  highlighted?: boolean;
  badge?: string;
  cta: string;
  features: string[];
}

export interface FeatureMatrixRow {
  feature: string;
  starter: boolean | string;
  pro: boolean | string;
  business: boolean | string;
  enterprise: boolean | string;
}

export interface CommercialSubscription {
  id: string;
  orgId: string;
  planId: CommercialPlanId;
  status: SubscriptionStatus;
  interval: BillingInterval;
  seats: number;
  seatsUsed: number;
  trialEndsAt?: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CommercialInvoice {
  id: string;
  orgId: string;
  subscriptionId: string;
  number: string;
  status: InvoiceStatus;
  amount: number;
  currency: string;
  periodStart: string;
  periodEnd: string;
  paidAt?: string;
  createdAt: string;
}

export interface OrgLicense {
  orgId: string;
  planId: CommercialPlanId;
  seatsTotal: number;
  seatsUsed: number;
  features: string[];
  validUntil: string;
}

export interface UsageCounter {
  id: string;
  orgId: string;
  metric: string;
  label: string;
  used: number;
  limit: number;
  unit: string;
  period: string;
}

export interface CommercialApiKey {
  id: string;
  orgId: string;
  name: string;
  prefix: string;
  scopes: string[];
  status: "active" | "revoked";
  createdAt: string;
  lastUsedAt?: string;
}

export interface CommercialWebhook {
  id: string;
  orgId: string;
  url: string;
  events: string[];
  status: "active" | "disabled";
  secret: string;
  createdAt: string;
}

export interface CommercialAuditEntry {
  id: string;
  orgId: string;
  actor: string;
  action: string;
  resource: string;
  details?: string;
  timestamp: string;
}

export interface BillingNotification {
  id: string;
  orgId: string;
  type: "invoice" | "trial" | "upgrade" | "downgrade" | "payment_failed";
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface CommercialCoupon {
  code: string;
  percentOff: number;
  planIds: CommercialPlanId[];
  validUntil: string;
  maxRedemptions: number;
  redemptions: number;
}

export interface AdminCommercialMetrics {
  mrr: number;
  arr: number;
  customers: number;
  revenue: number;
  activeTrials: number;
  conversions: number;
  churnRate: number;
  usageByPlan: Record<CommercialPlanId, number>;
  currency: string;
  asOf: string;
}

export interface LegalDocument {
  id: string;
  title: string;
  slug: string;
  summary: string;
  href: string;
  status: "ready" | "placeholder" | "draft";
}

export interface KnowledgeBaseArticle {
  id: string;
  title: string;
  summary: string;
  category: string;
  href?: string;
}

export interface DocsPortalSection {
  id: string;
  title: string;
  articles: KnowledgeBaseArticle[];
}

export interface StripeCheckoutResult {
  ok: boolean;
  mode: "dry-run" | "live";
  sessionId?: string;
  url?: string;
  message: string;
}

export const COMMERCIAL_VERSION = "6000.0.0";
