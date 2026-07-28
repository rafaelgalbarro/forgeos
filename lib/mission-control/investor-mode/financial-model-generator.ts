/** PROGRAM 5800 — 3-year financial model stub generator. */

import type { FinancialModel, VentureIntelligenceContext } from "./types";
import { HEURISTIC_DISCLAIMER } from "@/lib/venture-intelligence";

export function generateFinancialModel(ctx: VentureIntelligenceContext): FinancialModel {
  const monthlyBurn = Math.round(ctx.fundraisingEur / 24);
  const monthlyRevenue = Math.round(monthlyBurn * 0.4);
  const runwayMonths = ctx.runwayMonths;

  const projections = [1, 2, 3].map((year) => {
    const growthFactor = 1 + year * 0.6;
    const revenue = Math.round(monthlyRevenue * 12 * growthFactor);
    const burn = Math.round(monthlyBurn * 12 * (1 + year * 0.15));
    const headcount = Math.round(4 + year * 3);
    return {
      year,
      revenue,
      burn,
      netCash: Math.round(revenue - burn + ctx.fundraisingEur * (year === 1 ? 0.8 : 0)),
      headcount,
    };
  });

  return {
    currency: "EUR",
    horizonYears: 3,
    monthlyBurn,
    monthlyRevenue,
    runwayMonths,
    projections,
    assumptions: [
      "Crecimiento MRR 15–25% trimestral",
      "Churn objetivo <5% mensual",
      "Contratación escalonada post-ronda",
      "Sin dividendos — reinversión total",
    ],
    disclaimer: HEURISTIC_DISCLAIMER,
  };
}
