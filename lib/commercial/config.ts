/** Program 6000 — Commercial config (env-driven, dry-run default) */

export function isCommercialMode(): boolean {
  if (typeof process !== "undefined" && process.env.COMMERCIAL_MODE === "true") return true;
  if (typeof process !== "undefined" && process.env.NEXT_PUBLIC_COMMERCIAL_MODE === "true") return true;
  return true;
}

export function isStripeBillingEnabled(): boolean {
  if (typeof process === "undefined") return false;
  if (process.env.ENABLE_STRIPE_BILLING !== "true") return false;
  return Boolean(
    process.env.STRIPE_SECRET_KEY && process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  );
}

export function getStripePublishableKey(): string | undefined {
  return process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || undefined;
}

export function isEmailSendingEnabled(): boolean {
  return process.env.ENABLE_COMMERCIAL_EMAILS === "true";
}

export const COMMERCIAL_STORAGE_KEYS = {
  subscriptions: "forgeos-commercial-subscriptions",
  invoices: "forgeos-commercial-invoices",
  apiKeys: "forgeos-commercial-api-keys",
  webhooks: "forgeos-commercial-webhooks",
  auditLogs: "forgeos-commercial-audit-logs",
  notifications: "forgeos-commercial-notifications",
  usage: "forgeos-commercial-usage",
  coupons: "forgeos-commercial-coupons",
  activeOrg: "forgeos-commercial-active-org",
} as const;

export const DEFAULT_CURRENCY = "EUR";
