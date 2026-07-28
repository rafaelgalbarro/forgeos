/** PROGRAM 5800 — Read-only bridge to Venture Intelligence ecosystem. */

import type { Mission } from "../../types";
import type { VentureIntelligenceContext } from "../types";
import { readVentureMemory } from "../../pair-founder/venture-memory";

function inferStage(phase: Mission["phase"]): "pre-seed" | "seed" | "series-a" | "growth" {
  if (phase === "VALIDATE" || phase === "DEPLOY") return "pre-seed";
  if (phase === "OPERATE") return "seed";
  if (phase === "EVOLVE") return "series-a";
  return "pre-seed";
}

function inferFinancialInputs(mission: Mission) {
  const memory = readVentureMemory(mission.id);
  const phaseIdx = ["UNDERSTAND", "PLAN", "BUILD", "VALIDATE", "DEPLOY", "OPERATE", "EVOLVE"].indexOf(mission.phase);
  const progressFactor = Math.max(0.3, (phaseIdx + 1) / 7);

  return {
    ventureId: mission.id,
    ventureName: mission.idea || mission.title || "Venture",
    stage: inferStage(mission.phase),
    cashOnHand: Math.round(250_000 * progressFactor),
    monthlyBurn: Math.round(18_000 + progressFactor * 8_000),
    monthlyRevenue: Math.round(progressFactor * 12_000),
    mrrGrowthRatePct: Math.round(5 + progressFactor * 15),
    teamSize: Math.max(2, Math.round(2 + progressFactor * 4)),
    monthsOperating: Math.max(3, phaseIdx * 2),
    customerCount: Math.round(progressFactor * 25),
    marketSizeTAM: 500_000_000,
    keyFacts: memory.keyFacts,
    ventureSummary: memory.ventureSummary,
  };
}

export async function fetchVentureIntelligenceContext(mission: Mission): Promise<VentureIntelligenceContext> {
  const inputs = inferFinancialInputs(mission);

  const { buildVentureIntelligenceSnapshot } = await import("@/lib/venture-intelligence");
  const snap = buildVentureIntelligenceSnapshot(inputs);

  const phaseIdx = ["UNDERSTAND", "PLAN", "BUILD", "VALIDATE", "DEPLOY", "OPERATE", "EVOLVE"].indexOf(mission.phase);
  const stageStatus = (order: number): "completed" | "in_progress" | "not_started" => {
    const threshold = Math.floor((phaseIdx / 6) * 16);
    if (order <= threshold) return "completed";
    if (order <= threshold + 2) return "in_progress";
    return "not_started";
  };

  const scores = {
    marketScore: snap.marketScore.score,
    businessScore: snap.investorReadiness.score,
    executionScore: snap.executionScore.score,
    productScore: 60,
    financialScore: Math.round(snap.runway.months * 2),
    growthScore: snap.growthScore.score,
    riskScore: 70,
    overallVentureScore: snap.ventureScore.score,
  };

  let e2eInvestorScore: number | undefined;
  try {
    const { computeE2EReadiness } = await import("@/lib/venture-e2e");
    const { E2E_PIPELINE } = await import("@/lib/venture-e2e/pipeline-stages");
    const stages = E2E_PIPELINE.map((s) => ({
      ...s,
      status: stageStatus(s.order),
      resultSummary: "",
      risks: [] as string[],
      pending: [] as string[],
      recommendations: [] as string[],
    }));
    const readiness = computeE2EReadiness(stages, scores, snap);
    e2eInvestorScore = readiness.investorScore;
  } catch {
    /* venture-e2e unavailable */
  }

  let founderReadinessScore: number | undefined;
  try {
    const { computeReadinessLevels } = await import("@/lib/founder-zero");
    const { VALIDATION_PIPELINE } = await import("@/lib/founder-zero/pipeline-stages");
    const stages = VALIDATION_PIPELINE.map((s) => ({
      ...s,
      status: stageStatus(s.order),
      resultSummary: "",
      risks: [] as string[],
      pending: [] as string[],
      recommendations: [] as string[],
    }));
    const levels = computeReadinessLevels(stages, scores, snap);
    founderReadinessScore = levels.investorScore;
  } catch {
    /* founder-zero unavailable */
  }

  let networkBenchmarks: string[] | undefined;
  try {
    const { runIntelligenceNetwork } = await import("@/lib/intelligence-network");
    const netSnap = runIntelligenceNetwork();
    networkBenchmarks = netSnap.executiveInsights.slice(0, 3).map((i) => i.headline);
  } catch {
    /* intelligence-network unavailable */
  }

  return {
    ventureName: inputs.ventureName,
    intelligenceScore: snap.ventureScore.score,
    investorReadinessScore: snap.investorReadiness.score,
    valuationEur: snap.valuation.amountEur,
    runwayMonths: snap.runway.months,
    fundraisingEur: snap.fundraising.amountNeededEur,
    marketScore: snap.marketScore.score,
    growthScore: snap.growthScore.score,
    executionScore: snap.executionScore.score,
    executiveSummary: snap.executiveSummaryEs,
    dueDiligenceItems: snap.dueDiligence,
    investorRoomSections: snap.investorRoom.sections,
    e2eInvestorScore,
    founderReadinessScore,
    networkBenchmarks,
  };
}

export function buildVentureIntelligenceContextSync(mission: Mission): VentureIntelligenceContext {
  const inputs = inferFinancialInputs(mission);
  return {
    ventureName: inputs.ventureName,
    intelligenceScore: 65,
    investorReadinessScore: 55,
    valuationEur: 1_200_000,
    runwayMonths: 14,
    fundraisingEur: 500_000,
    marketScore: 70,
    growthScore: 65,
    executionScore: 60,
    executiveSummary: `Preparación de inversión para ${inputs.ventureName}.`,
    dueDiligenceItems: [],
    investorRoomSections: [],
  };
}
