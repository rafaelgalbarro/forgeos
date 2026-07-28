/** RC8 — Exit strategy engine (heuristic, dry-run). */

import type { ExitStrategyResult, VentureFinancialInputs } from "./types";
import { HEURISTIC_DISCLAIMER } from "./types";
import { scoreGrowth } from "./growth-score";
import { scoreMarket } from "./market-score";

export function analyzeExitStrategy(inputs: VentureFinancialInputs): ExitStrategyResult {
  const growth = scoreGrowth(inputs);
  const market = scoreMarket(inputs);
  const readinessScore = Math.round((growth.score + market.score) / 2);

  const scenarios = [
    {
      type: "acquisition" as const,
      probability: inputs.stage === "growth" ? 55 : 40,
      timelineYears: inputs.stage === "pre-seed" ? 5 : 4,
      notes: "Adquisición estratégica por player del sector",
    },
    {
      type: "ipo" as const,
      probability: inputs.stage === "growth" ? 15 : 5,
      timelineYears: 7,
      notes: "Salida pública — requiere escala y márgenes",
    },
    {
      type: "secondary" as const,
      probability: 20,
      timelineYears: 3,
      notes: "Venta parcial en ronda posterior",
    },
    {
      type: "bootstrap" as const,
      probability: inputs.monthlyRevenue > inputs.monthlyBurn ? 30 : 10,
      timelineYears: 0,
      notes: "Crecimiento autofinanciado si unit economics positivos",
    },
  ];

  return {
    readinessScore,
    scenarios,
    disclaimer: HEURISTIC_DISCLAIMER,
  };
}
