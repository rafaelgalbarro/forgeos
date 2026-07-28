/** RC8 — Benchmark engine (heuristic, dry-run). */

import type { BenchmarkResult, VentureFinancialInputs } from "./types";
import { HEURISTIC_DISCLAIMER } from "./types";

export function benchmarkVenture(inputs: VentureFinancialInputs): BenchmarkResult {
  const arr = inputs.monthlyRevenue * 12;
  const burnMultiple = inputs.monthlyRevenue > 0 ? inputs.monthlyBurn / inputs.monthlyRevenue : 0;
  const benchmarkBurnMultiple = 1.8;

  const metrics = [
    {
      label: "ARR",
      ventureValue: arr,
      benchmarkValue: 500_000,
      unit: "€",
      delta: arr >= 500_000 ? ("above" as const) : ("below" as const),
    },
    {
      label: "Crecimiento MRR",
      ventureValue: inputs.mrrGrowthRatePct,
      benchmarkValue: 10,
      unit: "%",
      delta: inputs.mrrGrowthRatePct >= 10 ? ("above" as const) : ("below" as const),
    },
    {
      label: "Burn multiple",
      ventureValue: Math.round(burnMultiple * 10) / 10,
      benchmarkValue: benchmarkBurnMultiple,
      unit: "x",
      delta:
        burnMultiple <= benchmarkBurnMultiple ? ("inline" as const) : ("above" as const),
    },
    {
      label: "Equipo",
      ventureValue: inputs.teamSize,
      benchmarkValue: 8,
      unit: "FTE",
      delta: inputs.teamSize >= 8 ? ("inline" as const) : ("below" as const),
    },
  ];

  return {
    sector: "SaaS B2B — Logística / Fleet",
    metrics,
    disclaimer: HEURISTIC_DISCLAIMER,
  };
}
