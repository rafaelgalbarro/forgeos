/** Program 9000 — Sector analysis stub. */

import { getSectorBenchmarks } from "@/lib/network/benchmark-engine";
import type { SectorAnalysis } from "./types";
import type { NetworkContext } from "@/lib/network/types";
import { DEMO_DISCLAIMER } from "@/lib/network/types";

export function buildSectorAnalysis(ctx: NetworkContext): SectorAnalysis {
  const bench = getSectorBenchmarks(ctx.sector);
  const riskLevel: SectorAnalysis["riskLevel"] =
    bench.churnPct > 5 ? "high" : bench.churnPct > 4 ? "medium" : "low";

  return {
    sector: ctx.sector,
    ventureCount: 47,
    medianGrowthPct: bench.growthPct,
    topOpportunity: "Expansión de plan Pro y reducción de churn en tier entry",
    riskLevel,
    disclaimer: DEMO_DISCLAIMER,
  };
}

export function formatSectorRiskEs(risk: SectorAnalysis["riskLevel"]): string {
  if (risk === "high") return "Riesgo elevado";
  if (risk === "medium") return "Riesgo moderado";
  return "Riesgo bajo";
}
