import type { VentureProject } from "@/lib/domain/venture";
import { resolvePrimaryDecision } from "@/lib/fos";
import { buildPortfolioSmartAction } from "@/lib/portfolio/impact-engine";

export interface CeoRecommendation {
  action: string;
  rationale: string;
  expectedImpact: string;
  href: string;
  estimatedTime: string;
  priority: "alta" | "media" | "baja";
}

export function buildCeoRecommendation(ventures: VentureProject[]): CeoRecommendation {
  const decision = resolvePrimaryDecision(ventures);
  const smart = buildPortfolioSmartAction(ventures);

  return {
    action: decision.label,
    rationale: decision.rationale,
    expectedImpact: decision.expectedImpact,
    href: decision.href,
    estimatedTime: smart?.estimatedTime ?? "15–20 min",
    priority: smart?.priority ?? "alta",
  };
}
