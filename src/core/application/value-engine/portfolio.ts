/**
 * Portfolio value comparison — PROGRAM 6120.
 * Compares ventures with uncertainty visible; no definitive rank without caveats.
 */

import type {
  ValueAssessment,
  ValueMilestone,
  VentureEconomics,
  ValueStage,
} from "@/src/core/domain";
import { stageIndex } from "@/src/core/domain";

export type PortfolioVentureComparisonRow = Readonly<{
  ventureId: string;
  ventureName: string;
  stage: ValueStage;
  opportunityState: string;
  evidenceCount: number;
  readinessNote: string;
  tractionState: string;
  economicsSummary: string;
  riskState: string;
  confidence: number;
  costToNextMilestone?: { amount: number; currency: string; valueType: string };
  expectedTimeToMilestone?: string;
  uncertaintyFlags: readonly string[];
}>;

export type ComparePortfolioVenturesResult = Readonly<{
  rows: readonly PortfolioVentureComparisonRow[];
  /** Explicit: ranking is advisory and uncertainty-aware — not definitive. */
  rankingDefinitive: false;
  comparisonNotes: readonly string[];
}>;

export type CompareInputVenture = Readonly<{
  ventureId: string;
  ventureName: string;
  assessment: ValueAssessment;
  evidenceCount: number;
  economics: VentureEconomics | null;
  nextMilestone: ValueMilestone | null;
}>;

export function comparePortfolioVentures(
  ventures: readonly CompareInputVenture[]
): ComparePortfolioVenturesResult {
  const rows: PortfolioVentureComparisonRow[] = ventures.map((v) => {
    const dims = v.assessment.props.dimensions;
    const opportunity = dims.find((d) => d.dimension === "MARKET_OPPORTUNITY");
    const traction = dims.find((d) => d.dimension === "TRACTION");
    const risk = dims.find((d) => d.dimension === "RISK");
    const product = dims.find((d) => d.dimension === "PRODUCT_READINESS");
    const gtm = dims.find((d) => d.dimension === "GO_TO_MARKET_READINESS");
    const uncertaintyFlags: string[] = [];
    if (v.evidenceCount === 0) uncertaintyFlags.push("NO_EVIDENCE");
    if (Number(v.assessment.props.overallConfidence) < 0.4) {
      uncertaintyFlags.push("LOW_CONFIDENCE");
    }
    if (v.assessment.props.missingEvidenceSummary.length > 0) {
      uncertaintyFlags.push("MISSING_EVIDENCE");
    }
    const econ = v.economics?.props;
    const hasActualRevenue = econ?.actualRevenue?.valueType === "ACTUAL";
    if (!hasActualRevenue) uncertaintyFlags.push("NO_ACTUAL_REVENUE");

    const cost = v.nextMilestone?.props.costToMilestone;
    return {
      ventureId: v.ventureId,
      ventureName: v.ventureName,
      stage: v.assessment.props.stage,
      opportunityState: opportunity?.state ?? "UNKNOWN",
      evidenceCount: v.evidenceCount,
      readinessNote: `product=${product?.state ?? "UNKNOWN"}; gtm=${gtm?.state ?? "UNKNOWN"}`,
      tractionState: traction?.state ?? "UNKNOWN",
      economicsSummary: hasActualRevenue
        ? `ACTUAL revenue ${econ?.actualRevenue?.money.amount} ${econ?.currency}`
        : `No ACTUAL revenue recorded (currency ${econ?.currency ?? "n/a"})`,
      riskState: risk?.state ?? "UNKNOWN",
      confidence: Number(v.assessment.props.overallConfidence),
      costToNextMilestone: cost
        ? {
            amount: cost.money.amount,
            currency: cost.money.currency,
            valueType: cost.valueType,
          }
        : undefined,
      expectedTimeToMilestone: v.nextMilestone?.props.dueDate
        ? `due ${v.nextMilestone.props.dueDate}`
        : "UNKNOWN",
      uncertaintyFlags,
    };
  });

  // Sort by stage then confidence, but flag that this is not a definitive ranking
  const sorted = [...rows].sort((a, b) => {
    const stageDiff = stageIndex(b.stage) - stageIndex(a.stage);
    if (stageDiff !== 0) return stageDiff;
    return b.confidence - a.confidence;
  });

  return {
    rows: sorted,
    rankingDefinitive: false,
    comparisonNotes: [
      "Order is advisory (stage index, then confidence) — not a definitive portfolio rank",
      "Uncertainty flags must be shown alongside any comparison UI",
      "ESTIMATED/PROJECTED economics never count as ACTUAL revenue",
      "No vanity metrics treated as proven value",
    ],
  };
}

export type PortfolioValueSummary = Readonly<{
  portfolioId: string;
  ventureCount: number;
  venturesWithEvidence: number;
  venturesWithActualRevenue: number;
  venturesBlocked: number;
  averageConfidence: number;
  stages: Readonly<Record<string, number>>;
  notes: readonly string[];
}>;

export function summarizePortfolioValue(
  portfolioId: string,
  ventures: readonly CompareInputVenture[]
): PortfolioValueSummary {
  const stages: Record<string, number> = {};
  let withEvidence = 0;
  let withRevenue = 0;
  let blocked = 0;
  let confSum = 0;
  for (const v of ventures) {
    stages[v.assessment.props.stage] = (stages[v.assessment.props.stage] ?? 0) + 1;
    if (v.evidenceCount > 0) withEvidence += 1;
    if (v.economics?.props.actualRevenue?.valueType === "ACTUAL") withRevenue += 1;
    if (v.assessment.props.dimensions.some((d) => d.state === "BLOCKED")) blocked += 1;
    confSum += Number(v.assessment.props.overallConfidence);
  }
  return {
    portfolioId,
    ventureCount: ventures.length,
    venturesWithEvidence: withEvidence,
    venturesWithActualRevenue: withRevenue,
    venturesBlocked: blocked,
    averageConfidence: ventures.length ? confSum / ventures.length : 0,
    stages,
    notes: [
      "Summary does not invent revenue or customers",
      "venturesWithActualRevenue counts only ACTUAL typed revenue fields",
    ],
  };
}
