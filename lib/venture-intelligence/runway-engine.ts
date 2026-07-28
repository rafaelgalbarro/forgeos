/** RC8 — Runway engine (heuristic, dry-run). */

import type { RunwayResult, VentureFinancialInputs } from "./types";
import { HEURISTIC_DISCLAIMER } from "./types";

export function calculateRunway(inputs: VentureFinancialInputs): RunwayResult {
  const netBurn = Math.max(inputs.monthlyBurn - inputs.monthlyRevenue, 0);
  const effectiveBurn = netBurn > 0 ? netBurn : inputs.monthlyBurn * 0.5;
  const months = effectiveBurn > 0 ? inputs.cashOnHand / effectiveBurn : 36;

  const end = new Date();
  end.setMonth(end.getMonth() + Math.floor(months));

  return {
    months: Math.round(months * 10) / 10,
    cashOnHand: inputs.cashOnHand,
    monthlyBurn: inputs.monthlyBurn,
    runwayEndDate: end.toISOString().slice(0, 10),
    disclaimer: HEURISTIC_DISCLAIMER,
  };
}
