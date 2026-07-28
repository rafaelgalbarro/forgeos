/** RC8 — Fundraising engine (heuristic, dry-run). */

import type { FundraisingResult, VentureFinancialInputs } from "./types";
import { HEURISTIC_DISCLAIMER } from "./types";
import { calculateRunway } from "./runway-engine";

const ROUND_TARGETS: Record<VentureFinancialInputs["stage"], { round: string; months: number }> = {
  "pre-seed": { round: "Pre-seed", months: 18 },
  seed: { round: "Seed", months: 18 },
  "series-a": { round: "Series A", months: 24 },
  growth: { round: "Series B+", months: 24 },
};

export function estimateFundraisingNeed(inputs: VentureFinancialInputs): FundraisingResult {
  const runway = calculateRunway(inputs);
  const target = ROUND_TARGETS[inputs.stage];
  const monthsToFund = Math.max(target.months - runway.months, 6);
  const netBurn = Math.max(inputs.monthlyBurn - inputs.monthlyRevenue, inputs.monthlyBurn * 0.7);
  const buffer = netBurn * 3;
  const amountNeededEur = Math.round(netBurn * monthsToFund + buffer);

  return {
    amountNeededEur,
    targetRound: target.round,
    useOfFunds: [
      "Contratación equipo clave",
      "Go-to-market y adquisición",
      "Producto y tecnología",
      "Reserva operativa (3 meses)",
    ],
    timelineMonths: Math.min(6, Math.max(3, Math.round(12 - runway.months))),
    disclaimer: HEURISTIC_DISCLAIMER,
  };
}
