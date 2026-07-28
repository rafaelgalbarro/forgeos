/** RC8 — Financial forecast engine (heuristic, dry-run). */

import type { ForecastResult, VentureFinancialInputs } from "./types";
import { HEURISTIC_DISCLAIMER } from "./types";

export function generateForecast(
  inputs: VentureFinancialInputs,
  horizonMonths = 12
): ForecastResult {
  const growthFactor = 1 + inputs.mrrGrowthRatePct / 100;
  const points = [];
  let cash = inputs.cashOnHand;
  let revenue = inputs.monthlyRevenue;

  for (let month = 1; month <= horizonMonths; month++) {
    revenue = revenue * growthFactor;
    const burn = inputs.monthlyBurn * (1 + month * 0.01);
    cash = cash + revenue - burn;
    points.push({
      month,
      revenue: Math.round(revenue),
      burn: Math.round(burn),
      cash: Math.round(cash),
    });
  }

  const lastPositive = points.findIndex((p) => p.cash <= 0);
  const projectedRunwayMonths =
    lastPositive === -1 ? horizonMonths + 6 : lastPositive + 1;

  return {
    horizonMonths,
    points,
    projectedRunwayMonths,
    disclaimer: HEURISTIC_DISCLAIMER,
  };
}
