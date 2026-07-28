/** Program 9000 — Anonymized benchmarks (extends RC10 + venture-intelligence). */

import { buildBenchmarks as buildNetworkBenchmarks, getSectorBenchmarks } from "@/lib/network/benchmark-engine";
import { benchmarkVenture } from "@/lib/venture-intelligence/benchmark-engine";
import type { BenchmarkResult, NetworkContext } from "@/lib/network/types";
import { DEMO_DISCLAIMER } from "@/lib/network/types";
import { isAnonymizedBenchmarksEnabled } from "./config";

export { getSectorBenchmarks, formatBenchmarkDeltaEs } from "@/lib/network/benchmark-engine";

export function buildIntelligenceBenchmarks(ctx: NetworkContext): BenchmarkResult {
  if (!isAnonymizedBenchmarksEnabled()) {
    return {
      sector: ctx.sector,
      metrics: [],
      growthRatePct: 0,
      sampleSize: 0,
      anonymized: true,
      disclaimer: DEMO_DISCLAIMER,
    };
  }

  const networkBench = buildNetworkBenchmarks(ctx);

  const viBench = benchmarkVenture({
    ventureId: ctx.ventureId,
    ventureName: ctx.ventureName,
    stage: "seed",
    cashOnHand: 250000,
    monthlyRevenue: ctx.monthlyRevenue ?? 4200,
    monthlyBurn: 18000,
    mrrGrowthRatePct: ctx.mrrGrowthPct ?? 12,
    teamSize: 6,
    monthsOperating: 18,
  });

  const arrMetric = viBench.metrics.find((m) => m.label === "ARR");
  if (arrMetric) {
    networkBench.metrics.push({
      label: "ARR (heurístico VI)",
      ventureValue: arrMetric.ventureValue,
      benchmarkValue: arrMetric.benchmarkValue,
      unit: arrMetric.unit,
      delta: arrMetric.delta,
    });
  }

  return networkBench;
}
