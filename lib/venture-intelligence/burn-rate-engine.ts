/** RC8 — Burn rate engine (heuristic, dry-run). */

import type { BurnRateResult, VentureFinancialInputs } from "./types";
import { HEURISTIC_DISCLAIMER } from "./types";

export function analyzeBurnRate(inputs: VentureFinancialInputs): BurnRateResult {
  const netBurn = inputs.monthlyBurn - inputs.monthlyRevenue;
  const burnPerEmployee =
    inputs.teamSize > 0 ? Math.round(inputs.monthlyBurn / inputs.teamSize) : inputs.monthlyBurn;
  const revenueCoveragePct =
    inputs.monthlyBurn > 0
      ? Math.min(100, Math.round((inputs.monthlyRevenue / inputs.monthlyBurn) * 100))
      : 100;

  return {
    monthlyBurn: inputs.monthlyBurn,
    burnPerEmployee,
    revenueCoveragePct,
    netBurn,
    disclaimer: HEURISTIC_DISCLAIMER,
  };
}
