/** Program 6000 — Pricing engine (plans display & comparison) */

import { DEFAULT_CURRENCY } from "./config";
import { COMMERCIAL_PLANS, FEATURE_MATRIX, formatPlanPrice, getPlan, listPlans } from "./plans";
import type { BillingInterval, CommercialPlan, CommercialPlanId, FeatureMatrixRow } from "./types";

export { COMMERCIAL_PLANS, FEATURE_MATRIX, formatPlanPrice, getPlan, listPlans };

export interface PricingQuote {
  planId: CommercialPlanId;
  plan: CommercialPlan;
  interval: BillingInterval;
  subtotal: number;
  discount: number;
  total: number;
  currency: string;
  seats: number;
}

export function quotePlan(
  planId: CommercialPlanId,
  interval: BillingInterval = "monthly",
  seats = 1,
  discountPercent = 0
): PricingQuote | null {
  const plan = getPlan(planId);
  if (!plan) return null;

  const base = interval === "annual" ? plan.annualPrice : plan.monthlyPrice;
  const subtotal = base * Math.max(1, Math.min(seats, plan.seats === 999 ? seats : plan.seats));
  const discount = Math.round(subtotal * (discountPercent / 100));
  const total = Math.max(0, subtotal - discount);

  return {
    planId,
    plan,
    interval,
    subtotal,
    discount,
    total,
    currency: plan.currency || DEFAULT_CURRENCY,
    seats,
  };
}

export function comparePlans(): FeatureMatrixRow[] {
  return FEATURE_MATRIX;
}

export function getRecommendedPlan(): CommercialPlanId {
  return "pro";
}

export function annualSavingsPercent(planId: CommercialPlanId): number {
  const plan = getPlan(planId);
  if (!plan || plan.monthlyPrice === 0) return 0;
  const yearlyMonthly = plan.monthlyPrice * 12;
  if (yearlyMonthly === 0) return 0;
  return Math.round(((yearlyMonthly - plan.annualPrice) / yearlyMonthly) * 100);
}
