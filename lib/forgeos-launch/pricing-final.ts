/** Program 7000 — Final pricing wired to commercial plans */

import {
  COMMERCIAL_PLANS,
  FEATURE_MATRIX,
  formatPlanPrice,
  listPlans,
  getFeatureMatrix,
} from "@/lib/commercial/plans";
import type { CommercialPlan } from "@/lib/commercial/types";

export { COMMERCIAL_PLANS, FEATURE_MATRIX, formatPlanPrice, listPlans, getFeatureMatrix };

export function getLaunchPricingPlans(): CommercialPlan[] {
  return listPlans();
}

export function getRecommendedLaunchPlan(): CommercialPlan {
  return COMMERCIAL_PLANS.find((p) => p.highlighted) ?? COMMERCIAL_PLANS[1];
}

export function getLaunchPricingSummary(): {
  planCount: number;
  startingPrice: string;
  enterpriseCta: string;
} {
  const starter = COMMERCIAL_PLANS[0];
  const enterprise = COMMERCIAL_PLANS.find((p) => p.id === "enterprise");
  return {
    planCount: COMMERCIAL_PLANS.length,
    startingPrice: formatPlanPrice(starter),
    enterpriseCta: enterprise?.cta ?? "Contactar ventas",
  };
}
