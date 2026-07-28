/** ForgeOS RC11 — Subscription engine (mock). */

import { getActiveOrganization, getOrganization } from "./organization-engine";
import { getPlanDefinition } from "./billing-engine";
import { listUsers } from "./user-engine";
import type { BillingPlan, Subscription } from "./types";

export function getSubscription(orgId?: string): Subscription | null {
  const org = orgId ? getOrganization(orgId) : getActiveOrganization();
  if (!org) return null;

  const plan = getPlanDefinition(org.plan);
  const seatsUsed = listUsers(org.id).length;
  const renews = new Date();
  renews.setMonth(renews.getMonth() + 1);

  return {
    orgId: org.id,
    plan: org.plan,
    status: "active",
    seats: plan.seats,
    seatsUsed,
    renewsAt: renews.toISOString(),
    monthlyPrice: plan.monthlyPrice,
    currency: "EUR",
  };
}

export function canUpgrade(current: BillingPlan): BillingPlan | null {
  if (current === "free") return "pro";
  if (current === "pro") return "enterprise";
  return null;
}

export function canDowngrade(current: BillingPlan): BillingPlan | null {
  if (current === "enterprise") return "pro";
  if (current === "pro") return "free";
  return null;
}
