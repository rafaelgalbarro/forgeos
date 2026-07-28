/** PROGRAM 5800 — Read-only bridge to Investor Mode financial model. */

import type { Mission } from "../../types";
import type { AdaptationRecommendation } from "../types";
import { generateAdaptationPlan } from "../strategy-adaptations";
import type { ExitStrategyType } from "../types";

export interface FinanzasAdaptationContext {
  missionId: string;
  recommendations: AdaptationRecommendation[];
  emphasis: "profitability" | "growth" | "dividends" | "fundraising" | "preservation";
  investorModeRelevant: boolean;
}

const EMPHASIS_MAP: Record<ExitStrategyType, FinanzasAdaptationContext["emphasis"]> = {
  venta: "growth",
  crecimiento_independiente: "profitability",
  dividendos: "dividends",
  venture_capital: "fundraising",
  patrimonio_familiar: "preservation",
};

export function buildFinanzasAdaptation(mission: Mission, strategy: ExitStrategyType): FinanzasAdaptationContext {
  const plan = generateAdaptationPlan(strategy);
  const finRecs = plan.recommendations.filter((r) => r.domain === "finanzas");

  return {
    missionId: mission.id,
    recommendations: finRecs,
    emphasis: EMPHASIS_MAP[strategy],
    investorModeRelevant: strategy === "venture_capital" || strategy === "venta",
  };
}

export async function fetchInvestorContext(mission: Mission): Promise<{ readinessScore: number } | null> {
  try {
    const { fetchVentureIntelligenceContext } = await import("../../investor-mode/adapters/venture-intelligence-adapter");
    const ctx = await fetchVentureIntelligenceContext(mission);
    return { readinessScore: ctx.investorReadinessScore };
  } catch {
    return null;
  }
}
