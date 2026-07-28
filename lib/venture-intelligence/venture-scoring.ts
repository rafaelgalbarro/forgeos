/** RC8 — Venture scoring orchestrator (heuristic, dry-run). */

import type { ScoredMetric, VentureFinancialInputs, VentureIntelligenceSnapshot } from "./types";
import { HEURISTIC_DISCLAIMER } from "./types";
import { estimateValuation, formatValuationEs } from "./valuation-engine";
import { calculateRunway } from "./runway-engine";
import { analyzeBurnRate } from "./burn-rate-engine";
import { generateForecast } from "./forecast-engine";
import { estimateFundraisingNeed } from "./fundraising-engine";
import { assessInvestorReadiness, buildDueDiligenceChecklist } from "./due-diligence-engine";
import { scoreGrowth } from "./growth-score";
import { scoreMarket } from "./market-score";
import { scoreExecution } from "./execution-score";
import { analyzeRisks } from "./risk-engine";
import { analyzeExitStrategy } from "./exit-strategy";
import { analyzeMaPotential } from "./ma-engine";
import { benchmarkVenture } from "./benchmark-engine";
import { buildInvestorRoom } from "./investor-room";
import { LAB_MOCK_VENTURE_ID } from "@/lib/lab/mock-venture";

function computeVentureScore(
  growth: ScoredMetric,
  market: ScoredMetric,
  execution: ScoredMetric,
  investorReadiness: number
): ScoredMetric {
  const score = Math.round(
    growth.score * 0.3 + market.score * 0.25 + execution.score * 0.25 + investorReadiness * 0.2
  );
  return {
    score,
    maxScore: 100,
    label: "Venture Score",
    disclaimer: HEURISTIC_DISCLAIMER,
    confidence: "heuristic",
    factors: ["Growth", "Market", "Execution", "Investor readiness"],
  };
}

export function buildVentureIntelligenceSnapshot(
  inputs: VentureFinancialInputs
): VentureIntelligenceSnapshot {
  const valuation = estimateValuation(inputs);
  const runway = calculateRunway(inputs);
  const burnRate = analyzeBurnRate(inputs);
  const forecast = generateForecast(inputs);
  const fundraising = estimateFundraisingNeed(inputs);
  const investorReadiness = assessInvestorReadiness(inputs);
  const dueDiligence = buildDueDiligenceChecklist(inputs);
  const risks = analyzeRisks(inputs);
  const growthScore = scoreGrowth(inputs);
  const marketScore = scoreMarket(inputs);
  const executionScore = scoreExecution(inputs);
  const ventureScore = computeVentureScore(
    growthScore,
    marketScore,
    executionScore,
    investorReadiness.score
  );
  const exitStrategy = analyzeExitStrategy(inputs);
  const maAnalysis = analyzeMaPotential(inputs);
  const benchmarks = benchmarkVenture(inputs);
  const investorRoom = buildInvestorRoom(inputs);

  const executiveSummaryEs =
    `Tu startup vale aproximadamente ${formatValuationEs(valuation.amountEur)}. [${HEURISTIC_DISCLAIMER}]\n` +
    `Runway estimado: ${Math.round(runway.months)} meses.\n` +
    `Necesidad de financiación: ${fundraising.amountNeededEur.toLocaleString("es-ES")} €.\n` +
    `Investor readiness: ${investorReadiness.score}%.\n` +
    `Riesgos principales: ${risks.topRisks.join(", ")}.\n` +
    `Próximo paso recomendado: ${investorReadiness.recommendedNextStep}.`;

  return {
    ventureId: inputs.ventureId,
    ventureName: inputs.ventureName,
    generatedAt: new Date().toISOString(),
    dryRunOnly: true,
    valuation,
    runway,
    burnRate,
    forecast,
    fundraising,
    investorReadiness,
    dueDiligence,
    risks,
    growthScore,
    marketScore,
    executionScore,
    ventureScore,
    exitStrategy,
    maAnalysis,
    benchmarks,
    investorRoom,
    executiveSummaryEs,
  };
}

/** Demo inputs tuned to produce ~2.4M€ valuation, 17 months runway, 350k funding need, 72% readiness. */
export function createDemoVentureInputs(): VentureFinancialInputs {
  return {
    ventureId: LAB_MOCK_VENTURE_ID,
    ventureName: "FleetPulse Lab",
    stage: "seed",
    cashOnHand: 612_000,
    monthlyBurn: 50_000,
    monthlyRevenue: 14_000,
    mrrGrowthRatePct: 11,
    teamSize: 8,
    monthsOperating: 14,
    marketSizeTAM: 1_200_000_000,
    customerCount: 42,
    churnRatePct: 4.2,
  };
}

export function buildDemoVentureIntelligenceSnapshot(): VentureIntelligenceSnapshot {
  return buildVentureIntelligenceSnapshot(createDemoVentureInputs());
}
