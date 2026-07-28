/** Program 4000 — Venture score aggregation. */

import type { VentureProject } from "@/lib/domain/venture";
import type { VentureIntelligenceSnapshot } from "@/lib/venture-intelligence";
import type { ValidationStage, VentureScoreBreakdown } from "./types";

export function buildVentureScoreBreakdown(
  venture: VentureProject,
  intelligence: VentureIntelligenceSnapshot | null,
  stages: ValidationStage[]
): VentureScoreBreakdown {
  const completedRatio = stages.filter((s) => s.status === "completed").length / Math.max(stages.length, 1);
  const blockedCount = stages.filter((s) => s.status === "blocked").length;

  const marketScore = intelligence?.marketScore.score ?? Math.round((venture.intelligenceReport?.startupScore ?? 50) * 0.9);
  const businessScore = intelligence
    ? Math.round((intelligence.investorReadiness.score + (venture.intelligenceReport?.startupScore ?? 50)) / 2)
    : venture.intelligenceReport?.startupScore ?? 55;
  const executionScore = intelligence?.executionScore.score ?? Math.round(completedRatio * 85);
  const productScore = venture.productPRD
    ? Math.min(95, 60 + (venture.productPRD.mvpScope?.length ?? 0) * 5)
    : Math.round(completedRatio * 50);
  const financialScore = intelligence
    ? Math.round((intelligence.runway.months / 24) * 50 + intelligence.investorReadiness.score * 0.5)
    : 45;
  const growthScore = intelligence?.growthScore.score ?? Math.round((venture.intelligenceReport?.startupScore ?? 50) * 0.85);
  const riskScore = Math.max(0, 100 - blockedCount * 12 - (venture.intelligenceReport?.risks?.length ?? 0) * 5);

  const overallVentureScore = Math.round(
    marketScore * 0.15 +
      businessScore * 0.15 +
      executionScore * 0.2 +
      productScore * 0.15 +
      financialScore * 0.1 +
      growthScore * 0.15 +
      riskScore * 0.1
  );

  return {
    marketScore: Math.min(100, marketScore),
    businessScore: Math.min(100, businessScore),
    executionScore: Math.min(100, executionScore),
    productScore: Math.min(100, productScore),
    financialScore: Math.min(100, financialScore),
    growthScore: Math.min(100, growthScore),
    riskScore: Math.min(100, riskScore),
    overallVentureScore: Math.min(100, overallVentureScore),
  };
}

/** Map venture fixture to Venture Intelligence inputs (generic, not VANDL-specific). */
export function ventureToIntelligenceInputs(venture: VentureProject) {
  const ir = venture.intelligenceReport;
  const sim = venture.ventureSimulatorResult;
  const scoreBoost = sim ? Math.round(sim.startupScore / 10) : 6;
  return {
    ventureId: venture.id,
    ventureName: venture.name,
    stage: "seed" as const,
    cashOnHand: 320_000 + scoreBoost * 15_000,
    monthlyBurn: 32_000 + scoreBoost * 1_200,
    monthlyRevenue: 6_000 + scoreBoost * 800,
    mrrGrowthRatePct: 7 + scoreBoost * 0.5,
    teamSize: scoreBoost,
    monthsOperating: 10,
    marketSizeTAM: parseTam(ir?.market?.tamEstimate),
    customerCount: 12 + scoreBoost * 2,
    churnRatePct: Math.max(2, 8 - scoreBoost * 0.3),
  };
}

function parseTam(tam?: string): number | undefined {
  if (!tam) return undefined;
  const m = tam.match(/[\d.]+/);
  if (!m) return undefined;
  const n = parseFloat(m[0]);
  if (tam.toLowerCase().includes("b")) return n * 1_000_000_000;
  if (tam.toLowerCase().includes("m")) return n * 1_000_000;
  return n;
}
