/** Program 6000 — Admin metrics (MRR, ARR, churn, etc.) */

import { DEFAULT_CURRENCY } from "./config";
import { getPlan } from "./plans";
import { listSubscriptions } from "./subscriptions";
import type { AdminCommercialMetrics, CommercialPlanId } from "./types";

export function computeAdminMetrics(): AdminCommercialMetrics {
  const subs = listSubscriptions().filter((s) => s.status !== "canceled");
  const usageByPlan: Record<CommercialPlanId, number> = {
    starter: 0,
    pro: 0,
    business: 0,
    enterprise: 0,
  };

  let mrr = 0;
  let activeTrials = 0;

  for (const sub of subs) {
    const plan = getPlan(sub.planId);
    if (!plan) continue;
    usageByPlan[sub.planId] += 1;
    if (sub.status === "trialing") {
      activeTrials += 1;
    } else {
      mrr += sub.interval === "annual" ? plan.annualPrice / 12 : plan.monthlyPrice;
    }
  }

  const customers = subs.length;
  const conversions = subs.filter((s) => s.planId !== "starter" && s.status === "active").length;
  const churnRate = customers > 0 ? Math.round((1 - conversions / Math.max(customers, 1)) * 100) / 100 : 0;

  return {
    mrr: Math.round(mrr),
    arr: Math.round(mrr * 12),
    customers,
    revenue: Math.round(mrr * 6),
    activeTrials,
    conversions,
    churnRate,
    usageByPlan,
    currency: DEFAULT_CURRENCY,
    asOf: new Date().toISOString(),
  };
}
