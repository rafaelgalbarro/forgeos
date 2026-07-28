import type { DetectedTag, MarketAnalysisOutput } from "./types";
import { hashScore } from "./heuristics";

export function analyzeMarket(text: string, tags: DetectedTag[]): MarketAnalysisOutput {
  const h = hashScore(text, 42);
  const isB2B = tags.some((t) => t.id === "b2b");
  const isMarketplace = tags.some((t) => t.id === "marketplace");
  const isAI = tags.some((t) => t.id === "ai");

  const marketSizes = ["€120M — €450M", "€500M — €1.2B", "€80M — €320M", "€1B+ (TAM global)"];
  const competition = ["Alta — 15+ competidores", "Media — 5-10 players", "Baja — nicho emergente", "Muy alta — incumbentes fuertes"];
  const innovation = ["Incremental", "Moderada", "Alta — ángulo diferenciado", "Disruptiva potencial"];
  const success = ["35%", "48%", "55%", "62%", "28%"];
  const scale = isB2B ? "Alta — bajo churn B2B" : isMarketplace ? "Muy alta — efecto red" : "Media — requiere growth";

  return {
    tamEstimate: marketSizes[h % marketSizes.length],
    growthTrend: isAI ? "Crecimiento acelerado (+40% YoY)" : "Crecimiento moderado (+12% YoY)",
    competitionLevel: isMarketplace ? competition[0] : competition[(h + 1) % competition.length],
    innovationLevel: isAI ? innovation[2] : innovation[h % innovation.length],
    successProbability: success[(h + 2) % success.length],
    scalability: scale,
  };
}

export function estimateMvpTime(text: string, tags: DetectedTag[]): string {
  const h = hashScore(text, 17);
  const techCount = tags.filter((t) => t.category === "tech").length;
  const times = ["4-6 semanas", "6-8 semanas", "8-10 semanas", "12-16 semanas"];
  const idx = Math.min(techCount, 2) + (h % 2);
  return times[idx];
}

export function estimateDevelopmentCost(text: string, tags: DetectedTag[]): string {
  const h = hashScore(text, 31);
  const isMarketplace = tags.some((t) => t.id === "marketplace");
  const costs = ["€15K — €35K", "€25K — €50K", "€40K — €80K", "€80K — €150K"];
  return costs[isMarketplace ? 2 : h % costs.length];
}

export function assessTechnicalComplexity(tags: DetectedTag[]): string {
  const techCount = tags.filter((t) => t.category === "tech").length;
  const hasMarketplace = tags.some((t) => t.id === "marketplace");
  const levels = ["Baja", "Media", "Alta", "Muy alta"];
  let idx = Math.min(techCount, 3);
  if (hasMarketplace) idx = Math.max(idx, 2);
  return levels[idx];
}
