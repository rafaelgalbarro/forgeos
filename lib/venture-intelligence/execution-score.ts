/** RC8 — Execution score (heuristic, dry-run). */

import type { ScoredMetric, VentureFinancialInputs } from "./types";
import { HEURISTIC_DISCLAIMER } from "./types";

export function scoreExecution(inputs: VentureFinancialInputs): ScoredMetric {
  const factors: string[] = [];
  let score = 50;

  if (inputs.teamSize >= 5) {
    score += 15;
    factors.push("Equipo fundador + early hires");
  } else {
    factors.push("Equipo reducido");
  }

  if (inputs.monthsOperating >= 6) {
    score += 10;
    factors.push("Ejecución >6 meses");
  }

  if (inputs.monthlyRevenue > 0) {
    score += 15;
    factors.push("Ingresos recurrentes");
  } else {
    factors.push("Sin ingresos recurrentes");
  }

  const burnEfficiency =
    inputs.monthlyRevenue > 0 ? inputs.monthlyRevenue / inputs.monthlyBurn : 0;
  if (burnEfficiency > 0.3) {
    score += 10;
    factors.push("Eficiencia de capital");
  }

  return {
    score: Math.min(score, 100),
    maxScore: 100,
    label: "Execution Score",
    disclaimer: HEURISTIC_DISCLAIMER,
    confidence: "heuristic",
    factors,
  };
}
