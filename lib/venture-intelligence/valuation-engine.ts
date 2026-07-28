/** RC8 — Valuation engine (heuristic, dry-run). */

import type { ValuationResult, VentureFinancialInputs } from "./types";
import { HEURISTIC_DISCLAIMER } from "./types";

const STAGE_MULTIPLIERS: Record<VentureFinancialInputs["stage"], number> = {
  "pre-seed": 8,
  seed: 12,
  "series-a": 15,
  growth: 18,
};

export function estimateValuation(inputs: VentureFinancialInputs): ValuationResult {
  const arr = inputs.monthlyRevenue * 12;
  const multiplier = STAGE_MULTIPLIERS[inputs.stage];
  const teamPremium = Math.min(inputs.teamSize * 50_000, 500_000);
  const growthPremium = inputs.mrrGrowthRatePct > 10 ? arr * 0.5 : 0;

  const base = arr * multiplier + teamPremium + growthPremium;
  const amountEur = Math.max(base, 800_000);

  return {
    amountEur: Math.round(amountEur),
    rangeLowEur: Math.round(amountEur * 0.75),
    rangeHighEur: Math.round(amountEur * 1.35),
    method: `ARR × ${multiplier}x + prima equipo + crecimiento`,
    disclaimer: HEURISTIC_DISCLAIMER,
    confidence: "heuristic",
  };
}

export function formatValuationEs(amountEur: number): string {
  if (amountEur >= 1_000_000) {
    const m = amountEur / 1_000_000;
    return `${m.toLocaleString("es-ES", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} M€`;
  }
  return `${amountEur.toLocaleString("es-ES")} €`;
}
