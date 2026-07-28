import type { DiscoveryContext } from "@/lib/discovery/types";
import { getDiscoveryScoreAdjustment } from "@/lib/discovery/discovery-intelligence";
import type { DetectedTag, FounderAdvisorOutput, IntelligenceRisk, LaunchPriority } from "./types";
import { classifyIdea, hashScore } from "./heuristics";
import { getIntelligenceKnowledgeHints } from "./knowledge-context";

export function calculateStartupScore(
  text: string,
  tags: DetectedTag[],
  founderAdvisor: FounderAdvisorOutput,
  discoveryContext?: DiscoveryContext | null
): number {
  let score = 55;
  const h = hashScore(text, 7);
  const { isMarketplace, isB2B, isPublicAid } = classifyIdea(text);

  if (tags.some((t) => t.id === "ai")) score += 8;
  if (isB2B) score += 10;
  if (tags.some((t) => t.id === "saas")) score += 5;
  if (isMarketplace) score -= 12;
  if (founderAdvisor.stance === "challenge") score -= 15;
  if (founderAdvisor.stance === "caution") score -= 8;
  if (founderAdvisor.stance === "proceed") score += 5;
  if (founderAdvisor.risks.filter((r) => r.severity === "alta").length >= 2) score -= 10;
  if (founderAdvisor.opportunities.filter((o) => o.probability === "alta").length >= 1) score += 6;
  if (text.length > 80) score += 4;
  if (isPublicAid) score -= 5;

  score += getIntelligenceKnowledgeHints(text, tags).scoreAdjustment;
  score += getDiscoveryScoreAdjustment(discoveryContext);

  score += (h % 11) - 5;
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function determineLaunchPriority(
  score: number,
  risks: IntelligenceRisk[]
): LaunchPriority {
  const highRisks = risks.filter((r) => r.severity === "alta").length;
  if (score >= 65 && highRisks <= 1) return "alta";
  if (score >= 45 && highRisks <= 2) return "media";
  return "baja";
}

export function scoreLabel(score: number): string {
  if (score >= 75) return "Alta viabilidad";
  if (score >= 55) return "Viabilidad moderada";
  if (score >= 35) return "Riesgo elevado";
  return "Requiere pivote";
}
