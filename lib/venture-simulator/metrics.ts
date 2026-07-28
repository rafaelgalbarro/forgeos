import type { ForgeIntelligenceReport } from "@/lib/intelligence/types";
import { getDiscoveryScoreAdjustment } from "@/lib/discovery/discovery-intelligence";
import type { DiscoveryContext } from "@/lib/discovery/types";
import type { SimulatorAssumptions, VentureSimulatorInput } from "./types";

export function resolveStartupScore(input: VentureSimulatorInput): number {
  if (input.intelligenceReport?.startupScore != null) {
    return input.intelligenceReport.startupScore;
  }
  const base = 45 + Math.min(20, Math.floor(input.ideaText.length / 8));
  return Math.max(0, Math.min(100, base));
}

export function calculateVentureScore(
  input: VentureSimulatorInput,
  assumptions: SimulatorAssumptions,
  startupScore: number
): number {
  let score = startupScore * 0.55;

  score += assumptions.discoveryBonus;
  score += assumptions.researchBonus;
  score += assumptions.productBonus;
  score += assumptions.knowledgeBonus;
  score -= assumptions.competitionPenalty;
  score -= assumptions.complexityPenalty;

  const discoveryAdj = getDiscoveryScoreAdjustment(input.discoveryContext ?? null);
  score += discoveryAdj * 0.5;

  const stance = input.intelligenceReport?.founderAdvisor.stance;
  if (stance === "challenge") score -= 12;
  if (stance === "caution") score -= 6;
  if (stance === "proceed") score += 4;

  if (input.researchReport && input.researchReport.opportunities.length >= 2) score += 4;
  if (input.productPRD && input.productPRD.mvpScope.length <= 7) score += 3;

  return Math.max(0, Math.min(100, Math.round(score)));
}

export function estimateBreakEvenMonths(
  year1Users: number,
  revenuePerUser: number,
  cac: number,
  monthlyBurnEstimate = 3500
): number | null {
  const monthlyRevenue = (year1Users * revenuePerUser) / 12;
  const acquisitionCostYear1 = year1Users * cac;
  const netMonthly = monthlyRevenue - monthlyBurnEstimate;
  if (netMonthly <= 0) return null;
  return Math.ceil(acquisitionCostYear1 / netMonthly);
}

export function estimateLTV(
  revenuePerUserYear: number,
  churnMonthlyPercent: number,
  assumptions: SimulatorAssumptions
): number {
  const monthsRetained = Math.max(3, Math.round(100 / churnMonthlyPercent));
  const monthlyValue = revenuePerUserYear / 12;
  const grossLTV = monthlyValue * monthsRetained;
  const cacRecovery = assumptions.baseCAC * 0.4;
  return Math.round(grossLTV - cacRecovery);
}

export function extractRisks(
  input: VentureSimulatorInput,
  assumptions: SimulatorAssumptions
): string[] {
  const risks: string[] = [];
  const intel = input.intelligenceReport;
  const research = input.researchReport;

  intel?.risks.slice(0, 3).forEach((r) => risks.push(`${r.title}: ${r.description}`));
  research?.marketRisks.slice(0, 2).forEach((r) => risks.push(r));
  input.discoveryContext?.buildConstraints.slice(0, 2).forEach((c) => risks.push(c));

  if (assumptions.competitionPenalty >= 10) {
    risks.push("Competencia elevada — diferenciación difícil sin wedge claro");
  }
  if (!input.discoveryContext?.answers.length) {
    risks.push("Decisiones de producto aún no aclaradas en Discovery");
  }

  return [...new Set(risks)].slice(0, 6);
}

export function extractOpportunities(input: VentureSimulatorInput): string[] {
  const opps: string[] = [];
  input.intelligenceReport?.opportunities.forEach((o) => opps.push(`${o.title}: ${o.description}`));
  input.researchReport?.opportunities.slice(0, 3).forEach((o) => opps.push(o));
  input.discoveryContext?.platformHints.forEach((h) => opps.push(h));
  return [...new Set(opps)].slice(0, 5);
}

export function extractAlternatives(input: VentureSimulatorInput): string[] {
  const alts: string[] = [];
  input.intelligenceReport?.founderAdvisor.alternatives.forEach((a) =>
    alts.push(`${a.title} — ${a.rationale}`)
  );
  input.researchReport?.differentiationAngles.slice(0, 2).forEach((d) => alts.push(d));
  if (alts.length === 0) {
    alts.push("Reducir alcance a un nicho vertical con mayor urgencia de compra");
    alts.push("Validar con landing + waitlist antes de desarrollo completo");
  }
  return alts.slice(0, 4);
}

export function deriveConfidence(
  input: VentureSimulatorInput,
  ventureScore: number
): import("./types").ConfidenceLevel {
  let points = 0;
  if (input.intelligenceReport) points += 2;
  if (input.discoveryContext && input.discoveryContext.answers.length >= 3) points += 2;
  else if (input.discoveryContext?.answers.length) points += 1;
  if (input.researchReport) points += 2;
  if (input.productPRD) points += 1;
  if (ventureScore >= 60) points += 1;

  if (points >= 6) return "alta";
  if (points >= 3) return "media";
  return "baja";
}
