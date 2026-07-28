/** Program 9000 — Growth signal aggregation. */

import type { GrowthSignal } from "./types";
import type { BenchmarkResult, NetworkContext } from "@/lib/network/types";
import { DEMO_DISCLAIMER } from "@/lib/network/types";

export function buildGrowthSignals(
  ctx: NetworkContext,
  benchmarks: BenchmarkResult
): GrowthSignal[] {
  const ventureGrowth = ctx.mrrGrowthPct ?? 12;
  return [
    {
      id: "gs-mrr-sector",
      label: "Crecimiento MRR sector",
      growthPct: benchmarks.growthRatePct,
      sector: ctx.sector,
      confidence: 0.84,
      disclaimer: DEMO_DISCLAIMER,
    },
    {
      id: "gs-venture-vs-network",
      label: "Tu venture vs red",
      growthPct: ventureGrowth,
      sector: ctx.sector,
      confidence: 0.79,
      disclaimer: DEMO_DISCLAIMER,
    },
    {
      id: "gs-expansion",
      label: "Señal de expansión de cuentas",
      growthPct: 18,
      sector: ctx.sector,
      confidence: 0.71,
      disclaimer: DEMO_DISCLAIMER,
    },
    {
      id: "gs-new-markets",
      label: "Entrada a mercados adyacentes",
      growthPct: 14,
      sector: ctx.sector,
      confidence: 0.65,
      disclaimer: DEMO_DISCLAIMER,
    },
  ];
}

export function getStrongestGrowthSignal(signals: GrowthSignal[]): GrowthSignal | null {
  if (signals.length === 0) return null;
  return [...signals].sort((a, b) => b.confidence - a.confidence)[0];
}
