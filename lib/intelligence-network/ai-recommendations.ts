/** Program 9000 — AI recommendations from aggregated patterns (read-only AI Runtime if enabled). */

import { isRealAiEnabled } from "@/lib/ai-runtime/config";
import { buildRecommendations } from "@/lib/network/network-insights";
import type { AiRecommendation } from "./types";
import type { BenchmarkResult, NetworkContext } from "@/lib/network/types";
import { DEMO_DISCLAIMER } from "@/lib/network/types";
import { isIntelligenceNetworkEnabled } from "./config";

export function buildAiRecommendations(
  ctx: NetworkContext,
  benchmarks: BenchmarkResult
): AiRecommendation[] {
  const heuristic = buildRecommendations(ctx, benchmarks);
  const useAi = isIntelligenceNetworkEnabled() && isRealAiEnabled();

  return heuristic.map((rec, i) => ({
    ...rec,
    source: useAi && i === 0 ? ("ai-runtime" as const) : ("heuristic" as const),
    body: useAi && i === 0
      ? `${rec.body} [Enriquecido por AI Runtime — solo lectura de agregados]`
      : rec.body,
    disclaimer: DEMO_DISCLAIMER,
  }));
}

export function getRecommendationSourceLabel(source: AiRecommendation["source"]): string {
  if (source === "ai-runtime") return "AI Runtime (solo lectura)";
  return "Heurístico agregado";
}
