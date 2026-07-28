/** RC10 — Aggregated benchmark engine (demo data, anonymized). */

import type { BenchmarkResult, NetworkContext } from "./types";
import { DEMO_DISCLAIMER } from "./types";

const SECTOR_BENCHMARKS: Record<
  string,
  { growthPct: number; pricingMedian: number; churnPct: number; cacEur: number }
> = {
  saas: { growthPct: 21, pricingMedian: 49, churnPct: 4.2, cacEur: 320 },
  fintech: { growthPct: 18, pricingMedian: 79, churnPct: 3.8, cacEur: 450 },
  marketplace: { growthPct: 24, pricingMedian: 29, churnPct: 5.1, cacEur: 280 },
  default: { growthPct: 15, pricingMedian: 39, churnPct: 4.5, cacEur: 300 },
};

export function getSectorBenchmarks(sector: string) {
  return SECTOR_BENCHMARKS[sector] ?? SECTOR_BENCHMARKS.default;
}

export function buildBenchmarks(ctx: NetworkContext): BenchmarkResult {
  const bench = getSectorBenchmarks(ctx.sector);
  const venturePricing = ctx.pricingPlanEur ?? 29;
  const ventureGrowth = ctx.mrrGrowthPct ?? 12;

  const pricingDelta: "above" | "below" | "inline" =
    venturePricing < bench.pricingMedian - 5
      ? "below"
      : venturePricing > bench.pricingMedian + 5
        ? "above"
        : "inline";

  const growthDelta: "above" | "below" | "inline" =
    ventureGrowth < bench.growthPct - 3
      ? "below"
      : ventureGrowth > bench.growthPct + 3
        ? "above"
        : "inline";

  return {
    sector: ctx.sector,
    growthRatePct: bench.growthPct,
    sampleSize: 47,
    anonymized: true,
    disclaimer: DEMO_DISCLAIMER,
    metrics: [
      {
        label: "Crecimiento MRR",
        ventureValue: ventureGrowth,
        benchmarkValue: bench.growthPct,
        unit: "%",
        delta: growthDelta,
      },
      {
        label: "Precio plan principal",
        ventureValue: venturePricing,
        benchmarkValue: bench.pricingMedian,
        unit: "€/mes",
        delta: pricingDelta,
      },
      {
        label: "Churn mensual",
        ventureValue: 5.8,
        benchmarkValue: bench.churnPct,
        unit: "%",
        delta: "above",
      },
      {
        label: "CAC",
        ventureValue: 380,
        benchmarkValue: bench.cacEur,
        unit: "€",
        delta: "above",
      },
    ],
  };
}

export function formatBenchmarkDeltaEs(delta: "above" | "below" | "inline"): string {
  if (delta === "above") return "por encima del benchmark";
  if (delta === "below") return "por debajo del benchmark";
  return "en línea con el benchmark";
}
