/** Program 6000 — Billing portal data aggregator */

import { ensureDemoInvoices, listInvoices } from "./invoices";
import { getOrgLicense } from "./licenses";
import { formatPlanPrice, getPlan } from "./plans";
import { quotePlan } from "./pricing-engine";
import { getStripeMode } from "./stripe-adapter";
import { ensureSubscription, getSubscription } from "./subscriptions";
import { listBillingNotifications } from "./notifications";
import { getUsageSummary } from "./usage-metering";
import type { CommercialPlanId } from "./types";

export interface BillingPortalData {
  orgId: string;
  subscription: ReturnType<typeof getSubscription>;
  license: ReturnType<typeof getOrgLicense>;
  plan: ReturnType<typeof getPlan>;
  quote: ReturnType<typeof quotePlan>;
  invoices: ReturnType<typeof listInvoices>;
  notifications: ReturnType<typeof listBillingNotifications>;
  usage: ReturnType<typeof getUsageSummary>;
  stripeMode: ReturnType<typeof getStripeMode>;
  priceLabel: string;
}

export function getBillingPortalData(orgId?: string): BillingPortalData {
  const sub = ensureSubscription(orgId);
  const plan = getPlan(sub.planId)!;
  ensureDemoInvoices(sub.orgId);

  return {
    orgId: sub.orgId,
    subscription: sub,
    license: getOrgLicense(sub.orgId),
    plan,
    quote: quotePlan(sub.planId, sub.interval, sub.seatsUsed)!,
    invoices: listInvoices(sub.orgId),
    notifications: listBillingNotifications(sub.orgId),
    usage: getUsageSummary(sub.orgId),
    stripeMode: getStripeMode(),
    priceLabel: formatPlanPrice(plan, sub.interval),
  };
}

export function getUpgradeOptions(currentPlanId: CommercialPlanId): CommercialPlanId[] {
  const order: CommercialPlanId[] = ["starter", "pro", "business", "enterprise"];
  const idx = order.indexOf(currentPlanId);
  return order.slice(idx + 1);
}

export function getDowngradeOptions(currentPlanId: CommercialPlanId): CommercialPlanId[] {
  const order: CommercialPlanId[] = ["starter", "pro", "business", "enterprise"];
  const idx = order.indexOf(currentPlanId);
  return order.slice(0, idx).reverse();
}
