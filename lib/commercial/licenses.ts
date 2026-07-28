/** Program 6000 — Org licenses and seats */

import { getPlan } from "./plans";
import { ensureSubscription, getSubscription } from "./subscriptions";
import type { CommercialPlanId, OrgLicense } from "./types";

export function getOrgLicense(orgId?: string): OrgLicense | null {
  const sub = getSubscription(orgId) ?? ensureSubscription(orgId);
  const plan = getPlan(sub.planId);
  if (!plan) return null;

  return {
    orgId: sub.orgId,
    planId: sub.planId,
    seatsTotal: sub.seats,
    seatsUsed: sub.seatsUsed,
    features: plan.features,
    validUntil: sub.currentPeriodEnd,
  };
}

export function canAddSeat(orgId?: string): boolean {
  const license = getOrgLicense(orgId);
  if (!license) return false;
  if (license.seatsTotal >= 999) return true;
  return license.seatsUsed < license.seatsTotal;
}

export function planIncludesFeature(planId: CommercialPlanId, featureKey: string): boolean {
  const plan = getPlan(planId);
  if (!plan) return false;
  return plan.features.some((f) => f.toLowerCase().includes(featureKey.toLowerCase()));
}
