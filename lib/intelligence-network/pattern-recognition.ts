/** Program 9000 — Pattern detection heuristics. */

import type { DetectedPattern } from "./types";
import type { BenchmarkResult, NetworkContext } from "@/lib/network/types";
import { DEMO_DISCLAIMER } from "@/lib/network/types";

export function detectNetworkPatterns(
  ctx: NetworkContext,
  benchmarks: BenchmarkResult
): DetectedPattern[] {
  const patterns: DetectedPattern[] = [];

  const pricingBelow = benchmarks.metrics.some(
    (m) => m.label.includes("Precio") && m.delta === "below"
  );
  if (pricingBelow) {
    patterns.push({
      id: "pat-underpriced",
      name: "Pricing por debajo del sector",
      description: `Ventures ${ctx.sector} con pricing bajo tienden a compensar con volumen o upsell.`,
      frequencyPct: 38,
      sectors: [ctx.sector, "saas"],
      disclaimer: DEMO_DISCLAIMER,
    });
  }

  patterns.push(
    {
      id: "pat-growth-acceleration",
      name: "Aceleración de crecimiento Q2",
      description: `El ${benchmarks.growthRatePct}% de crecimiento mediano sugiere mercado en expansión.`,
      frequencyPct: 54,
      sectors: [ctx.sector],
      disclaimer: DEMO_DISCLAIMER,
    },
    {
      id: "pat-churn-entry",
      name: "Churn concentrado en tier entry",
      description: "Patrón recurrente: churn elevado en planes < 40 €/mes.",
      frequencyPct: 41,
      sectors: ["saas", "fintech"],
      disclaimer: DEMO_DISCLAIMER,
    }
  );

  return patterns;
}

export function getTopPattern(patterns: DetectedPattern[]): DetectedPattern | null {
  if (patterns.length === 0) return null;
  return [...patterns].sort((a, b) => b.frequencyPct - a.frequencyPct)[0];
}
