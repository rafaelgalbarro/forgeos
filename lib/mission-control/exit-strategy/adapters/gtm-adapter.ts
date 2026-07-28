/** PROGRAM 5700 — Read-only bridge to Go To Market. */

import type { Mission } from "../../types";
import type { AdaptationRecommendation } from "../types";
import { generateAdaptationPlan } from "../strategy-adaptations";
import type { ExitStrategyType } from "../types";

export interface MarketingAdaptationContext {
  missionId: string;
  recommendations: AdaptationRecommendation[];
  gtmIntensity: "low" | "medium" | "high";
  brandVsPerformance: "brand" | "balanced" | "performance";
  investorVisibility: boolean;
}

const GTM_INTENSITY: Record<ExitStrategyType, MarketingAdaptationContext["gtmIntensity"]> = {
  venta: "medium",
  crecimiento_independiente: "low",
  dividendos: "low",
  venture_capital: "high",
  patrimonio_familiar: "medium",
};

const BRAND_PERF: Record<ExitStrategyType, MarketingAdaptationContext["brandVsPerformance"]> = {
  venta: "balanced",
  crecimiento_independiente: "performance",
  dividendos: "brand",
  venture_capital: "performance",
  patrimonio_familiar: "brand",
};

export function buildMarketingAdaptation(mission: Mission, strategy: ExitStrategyType): MarketingAdaptationContext {
  const plan = generateAdaptationPlan(strategy);
  const mktRecs = plan.recommendations.filter((r) => r.domain === "marketing");

  return {
    missionId: mission.id,
    recommendations: mktRecs,
    gtmIntensity: GTM_INTENSITY[strategy],
    brandVsPerformance: BRAND_PERF[strategy],
    investorVisibility: strategy === "venture_capital" || strategy === "venta",
  };
}

export async function fetchGTMContext(mission: Mission): Promise<{ deliverableCount: number } | null> {
  try {
    const { buildGTMContext } = await import("../../go-to-market/gtm-context");
    const ctx = buildGTMContext(mission);
    return { deliverableCount: ctx.contextHash.length > 0 ? 8 : 0 };
  } catch {
    return null;
  }
}
