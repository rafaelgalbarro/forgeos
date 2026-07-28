/** RC10 — Network insights and recommendations (demo). */

import type {
  AnonymousComparison,
  BenchmarkResult,
  NetworkContext,
  NetworkInsight,
  NetworkRecommendation,
} from "./types";
import { DEMO_DISCLAIMER } from "./types";
import { formatBenchmarkDeltaEs } from "./benchmark-engine";

export function buildAnonymousComparisons(
  _ctx: NetworkContext,
  benchmarks: BenchmarkResult
): AnonymousComparison[] {
  return benchmarks.metrics.map((m) => {
    const percentile =
      m.delta === "above"
        ? Math.min(75 + Math.random() * 15, 95)
        : m.delta === "below"
          ? Math.max(15 + Math.random() * 20, 10)
          : 45 + Math.random() * 10;

    return {
      metric: m.label,
      yourValue: m.ventureValue,
      networkMedian: m.benchmarkValue,
      percentile: Math.round(percentile),
      unit: m.unit,
      disclaimer: DEMO_DISCLAIMER,
    };
  });
}

export function buildRecommendations(
  ctx: NetworkContext,
  benchmarks: BenchmarkResult
): NetworkRecommendation[] {
  const pricingMetric = benchmarks.metrics.find((m) => m.label.includes("Precio"));
  const isPricingBelow = pricingMetric?.delta === "below";

  const recs: NetworkRecommendation[] = [];

  if (isPricingBelow) {
    recs.push({
      id: "rec-pricing-pro",
      title: "Probar plan Pro a 49 €/mes",
      body: "Tu pricing está por debajo del benchmark. Un plan Pro podría mejorar ARPU sin perder conversión.",
      impactEstimate: "+14% revenue",
      confidence: 0.78,
      category: "pricing",
      disclaimer: DEMO_DISCLAIMER,
    });
  }

  recs.push({
    id: "rec-growth-focus",
    title: "Acelerar crecimiento MRR",
    body: `Las startups ${ctx.sector} similares están creciendo un ${benchmarks.growthRatePct}%.`,
    impactEstimate: "+8% MRR en 6 meses",
    confidence: 0.72,
    category: "growth",
    disclaimer: DEMO_DISCLAIMER,
  });

  recs.push({
    id: "rec-churn-reduce",
    title: "Reducir churn en tier entry",
    body: "Tu churn está por encima de la media de red. Considera onboarding guiado y plan intermedio.",
    impactEstimate: "-1.5pp churn",
    confidence: 0.69,
    category: "product",
    disclaimer: DEMO_DISCLAIMER,
  });

  return recs;
}

export function buildInsights(
  ctx: NetworkContext,
  benchmarks: BenchmarkResult,
  recommendations: NetworkRecommendation[]
): NetworkInsight[] {
  const pricingMetric = benchmarks.metrics.find((m) => m.label.includes("Precio"));
  const insights: NetworkInsight[] = [
    {
      id: "insight-growth",
      headline: `Las startups ${ctx.sector} similares están creciendo un ${benchmarks.growthRatePct}%.`,
      detail: `Basado en ${benchmarks.sampleSize} ventures anonimizadas del sector.`,
      type: "trend",
      priority: "high",
      disclaimer: DEMO_DISCLAIMER,
    },
  ];

  if (pricingMetric) {
    insights.push({
      id: "insight-pricing",
      headline: `Tu pricing está ${formatBenchmarkDeltaEs(pricingMetric.delta)}.`,
      detail: `Tu plan: ${pricingMetric.ventureValue} ${pricingMetric.unit} · Red: ${pricingMetric.benchmarkValue} ${pricingMetric.unit}`,
      type: "benchmark",
      priority: "high",
      disclaimer: DEMO_DISCLAIMER,
    });
  }

  const topRec = recommendations[0];
  if (topRec) {
    insights.push({
      id: "insight-rec",
      headline: `Recomendación: ${topRec.title}.`,
      detail: `Impacto estimado: ${topRec.impactEstimate}.`,
      type: "recommendation",
      priority: "high",
      disclaimer: DEMO_DISCLAIMER,
    });
  }

  return insights;
}

export function buildExecutiveSummaryEs(
  ctx: NetworkContext,
  benchmarks: BenchmarkResult,
  recommendations: NetworkRecommendation[]
): string {
  const topRec = recommendations[0];
  const lines = [
    `Las startups ${ctx.sector} similares están creciendo un ${benchmarks.growthRatePct}%.`,
    "Tu pricing está por debajo del benchmark.",
  ];

  if (topRec) {
    lines.push(`Recomendación: ${topRec.title.toLowerCase()}.`);
    lines.push(`Impacto estimado: ${topRec.impactEstimate}.`);
  }

  return lines.join(" ");
}
