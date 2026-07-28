/** Program 9000 — Network-level executive insights. */

import type { ExecutiveInsight } from "./types";
import type {
  BenchmarkResult,
  NetworkContext,
  NetworkRecommendation,
} from "@/lib/network/types";
import { DEMO_DISCLAIMER } from "@/lib/network/types";
import { formatBenchmarkDeltaEs } from "@/lib/network/benchmark-engine";

export function buildExecutiveInsights(
  ctx: NetworkContext,
  benchmarks: BenchmarkResult,
  recommendations: NetworkRecommendation[]
): ExecutiveInsight[] {
  const pricingMetric = benchmarks.metrics.find((m) => m.label.includes("Precio"));
  const insights: ExecutiveInsight[] = [
    {
      id: "exec-growth-sector",
      headline: `Sector ${ctx.sector}: crecimiento mediano ${benchmarks.growthRatePct}%`,
      narrative: `Basado en ${benchmarks.sampleSize} ventures anonimizadas. Tu venture compite en un mercado en expansión.`,
      priority: "high",
      category: "growth",
      disclaimer: DEMO_DISCLAIMER,
    },
  ];

  if (pricingMetric) {
    insights.push({
      id: "exec-pricing-gap",
      headline: `Brecha de pricing: ${formatBenchmarkDeltaEs(pricingMetric.delta)}`,
      narrative: `Plan actual ${pricingMetric.ventureValue} ${pricingMetric.unit} vs mediana red ${pricingMetric.benchmarkValue} ${pricingMetric.unit}.`,
      priority: pricingMetric.delta === "below" ? "critical" : "medium",
      category: "pricing",
      disclaimer: DEMO_DISCLAIMER,
    });
  }

  const topRec = recommendations[0];
  if (topRec) {
    insights.push({
      id: "exec-top-action",
      headline: topRec.title,
      narrative: `${topRec.body} Impacto estimado: ${topRec.impactEstimate}.`,
      priority: "high",
      category: topRec.category,
      disclaimer: DEMO_DISCLAIMER,
    });
  }

  insights.push({
    id: "exec-network-privacy",
    headline: "Red operando con aislamiento total",
    narrative:
      "Solo agregados anonimizados visibles. Sin datos crudos cross-org ni cross-workspace.",
    priority: "medium",
    category: "governance",
    disclaimer: DEMO_DISCLAIMER,
  });

  return insights;
}

export function buildExecutiveSummaryFromInsights(insights: ExecutiveInsight[]): string {
  return insights
    .filter((i) => i.priority === "critical" || i.priority === "high")
    .slice(0, 3)
    .map((i) => i.headline)
    .join(". ");
}
