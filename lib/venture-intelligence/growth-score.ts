/** RC8 — Growth score (heuristic, dry-run). */

import type { ScoredMetric, VentureFinancialInputs } from "./types";
import { HEURISTIC_DISCLAIMER } from "./types";

export function scoreGrowth(inputs: VentureFinancialInputs): ScoredMetric {
  const factors: string[] = [];
  let score = 40;

  if (inputs.mrrGrowthRatePct >= 15) {
    score += 25;
    factors.push("Crecimiento MRR >15%");
  } else if (inputs.mrrGrowthRatePct >= 8) {
    score += 15;
    factors.push("Crecimiento MRR moderado");
  } else {
    factors.push("Crecimiento MRR bajo");
  }

  if ((inputs.customerCount ?? 0) >= 50) {
    score += 15;
    factors.push("Base de clientes inicial");
  } else {
    factors.push("Tracción de clientes limitada");
  }

  if (inputs.churnRatePct != null && inputs.churnRatePct < 5) {
    score += 10;
    factors.push("Churn controlado");
  }

  if (inputs.monthsOperating >= 12) {
    score += 10;
    factors.push("Operando >12 meses");
  }

  return {
    score: Math.min(score, 100),
    maxScore: 100,
    label: "Growth Score",
    disclaimer: HEURISTIC_DISCLAIMER,
    confidence: "heuristic",
    factors,
  };
}
