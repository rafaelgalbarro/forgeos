/** RC8 — Market score (heuristic, dry-run). */

import type { ScoredMetric, VentureFinancialInputs } from "./types";
import { HEURISTIC_DISCLAIMER } from "./types";

export function scoreMarket(inputs: VentureFinancialInputs): ScoredMetric {
  const factors: string[] = [];
  let score = 45;

  const tam = inputs.marketSizeTAM ?? 500_000_000;
  if (tam >= 1_000_000_000) {
    score += 25;
    factors.push("TAM >1B€");
  } else if (tam >= 200_000_000) {
    score += 15;
    factors.push("TAM >200M€");
  } else {
    factors.push("TAM acotado");
  }

  if (inputs.stage === "seed" || inputs.stage === "series-a") {
    score += 10;
    factors.push("Timing de mercado favorable");
  }

  if (inputs.mrrGrowthRatePct > 10) {
    score += 10;
    factors.push("Demanda validada por crecimiento");
  } else {
    factors.push("Validación de mercado pendiente");
  }

  return {
    score: Math.min(score, 100),
    maxScore: 100,
    label: "Market Score",
    disclaimer: HEURISTIC_DISCLAIMER,
    confidence: "heuristic",
    factors,
  };
}
