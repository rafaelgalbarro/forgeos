/** PROGRAM 5800 — Valuation summary generator. */

import type { ValuationSummary, VentureIntelligenceContext } from "./types";
import { HEURISTIC_DISCLAIMER } from "@/lib/venture-intelligence";

export function generateValuationSummary(ctx: VentureIntelligenceContext): ValuationSummary {
  const amountEur = ctx.valuationEur;
  const rangeLowEur = Math.round(amountEur * 0.75);
  const rangeHighEur = Math.round(amountEur * 1.35);

  const factors = [
    `Market score: ${ctx.marketScore}/100`,
    `Growth score: ${ctx.growthScore}/100`,
    `Execution score: ${ctx.executionScore}/100`,
    `Investor readiness VI: ${ctx.investorReadinessScore}%`,
  ];

  if (ctx.e2eInvestorScore) factors.push(`E2E investor score: ${ctx.e2eInvestorScore}%`);
  if (ctx.founderReadinessScore) factors.push(`Founder Zero readiness: ${ctx.founderReadinessScore}%`);

  return {
    methodology: "ARR × múltiplo etapa + prima equipo + crecimiento (Venture Intelligence)",
    amountEur,
    rangeLowEur,
    rangeHighEur,
    confidence: "heuristic",
    factors,
    disclaimer: HEURISTIC_DISCLAIMER,
  };
}
