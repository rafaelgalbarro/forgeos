/**
 * Transparent value assessment — PROGRAM 6120.
 * No black-box ranking. Scores (if any) show formula, weights, missing data,
 * and never exceed available confidence.
 */

import {
  ValueAssessment,
  VALUE_DIMENSIONS,
  getStageDefinition,
  Confidence,
  type DimensionAssessment,
  type EvidenceType,
  type ValueDimension,
  type ValueDimensionState,
  type ValueEvidence,
  type ValueHypothesis,
  type ValueMetric,
  type ValueOpportunity,
  type ValueRisk,
  type ValueStage,
  type VentureId,
} from "@/src/core/domain";

const STATE_RANK: Record<ValueDimensionState, number> = {
  UNKNOWN: 0,
  NOT_MEASURED: 0,
  NOT_APPLICABLE: 0,
  INSUFFICIENT_EVIDENCE: 1,
  HYPOTHESIS: 2,
  WEAK: 3,
  MODERATE: 4,
  STRONG: 5,
  VALIDATED: 6,
  INVALIDATED: 0,
  BLOCKED: 0,
};

const DIMENSION_EVIDENCE: Partial<Record<ValueDimension, readonly EvidenceType[]>> = {
  MARKET_OPPORTUNITY: ["RESEARCH_SOURCE", "EXTERNAL_VALIDATION"],
  PROBLEM_EVIDENCE: ["CUSTOMER_INTERVIEW", "SURVEY", "RESEARCH_SOURCE"],
  CUSTOMER_EVIDENCE: ["CUSTOMER_INTERVIEW", "SURVEY", "LETTER_OF_INTENT", "WAITLIST"],
  SOLUTION_EVIDENCE: ["DEMO_REQUEST", "LETTER_OF_INTENT", "EXPERIMENT_RESULT"],
  PRODUCT_READINESS: ["PILOT", "ACTIVE_USER", "OPERATIONAL_RESULT"],
  GO_TO_MARKET_READINESS: ["LANDING_CONVERSION", "WAITLIST", "DEMO_REQUEST"],
  TRACTION: ["ACTIVE_USER", "RETENTION_EVENT", "DEMO_REQUEST"],
  REVENUE: ["PAYING_CUSTOMER", "REVENUE_EVENT"],
  UNIT_ECONOMICS: ["REVENUE_EVENT", "COST_EVENT"],
  OPERATING_READINESS: ["OPERATIONAL_RESULT"],
  SCALABILITY: ["OPERATIONAL_RESULT", "RETENTION_EVENT"],
  DEFENSIBILITY: ["EXTERNAL_VALIDATION", "RESEARCH_SOURCE"],
  RISK: ["OPERATIONAL_RESULT", "COST_EVENT"],
  EXECUTION_CONFIDENCE: ["EXPERIMENT_RESULT", "OPERATIONAL_RESULT"],
};

function uniqueTypes(evidence: readonly ValueEvidence[]): Set<EvidenceType> {
  return new Set(evidence.map((e) => e.props.type));
}

function inferState(
  dimension: ValueDimension,
  evidence: readonly ValueEvidence[],
  hypotheses: readonly ValueHypothesis[],
  metrics: readonly ValueMetric[],
  risks: readonly ValueRisk[],
  opportunities: readonly ValueOpportunity[]
): { state: ValueDimensionState; missing: string[]; evidenceIds: string[] } {
  const relevant = evidence.filter((e) => {
    const wanted = DIMENSION_EVIDENCE[dimension] ?? [];
    return wanted.includes(e.props.type);
  });
  const evidenceIds = relevant.map((e) => String(e.id));
  const wanted = DIMENSION_EVIDENCE[dimension] ?? [];
  const have = uniqueTypes(relevant);
  const missing = wanted.filter((t) => !have.has(t)).map((t) => `Missing evidence type: ${t}`);

  if (dimension === "RISK") {
    const critical = risks.filter((r) => r.props.severity === "CRITICAL" || r.props.severity === "HIGH");
    if (critical.length) {
      return { state: "BLOCKED", missing, evidenceIds };
    }
  }

  if (dimension === "MARKET_OPPORTUNITY") {
    const opp = opportunities.filter((o) => o.props.dimension === "MARKET_OPPORTUNITY");
    if (opp.some((o) => o.props.magnitude === "HIGH") && relevant.length === 0) {
      return {
        state: "HYPOTHESIS",
        missing: [...missing, "Opportunity stated without validation evidence"],
        evidenceIds,
      };
    }
    if (opp.some((o) => o.props.magnitude === "HIGH") && relevant.length > 0) {
      return { state: "STRONG", missing, evidenceIds };
    }
  }

  if (dimension === "REVENUE") {
    const revenueMetrics = metrics.filter(
      (m) => (m.props.kind === "MRR" || m.props.kind === "ARR" || m.props.kind === "PAYING_CUSTOMERS") &&
        m.props.valueType === "ACTUAL"
    );
    if (revenueMetrics.length === 0 && relevant.length === 0) {
      return {
        state: "NOT_MEASURED",
        missing: ["No ACTUAL revenue or paying-customer evidence"],
        evidenceIds,
      };
    }
    // Never treat ESTIMATED/PROJECTED as revenue proof
    const projectedOnly = metrics.some(
      (m) =>
        (m.props.kind === "MRR" || m.props.kind === "ARR") &&
        (m.props.valueType === "ESTIMATED" || m.props.valueType === "PROJECTED")
    );
    if (projectedOnly && revenueMetrics.length === 0) {
      return {
        state: "INSUFFICIENT_EVIDENCE",
        missing: ["Only ESTIMATED/PROJECTED revenue present — not ACTUAL"],
        evidenceIds,
      };
    }
  }

  const hyp = hypotheses.filter((h) => h.props.dimension === dimension);
  if (relevant.length === 0 && hyp.length === 0) {
    return { state: "UNKNOWN", missing: missing.length ? missing : ["No evidence or hypothesis"], evidenceIds };
  }
  if (relevant.length === 0 && hyp.length > 0) {
    return { state: "HYPOTHESIS", missing, evidenceIds };
  }
  if (relevant.length === 1) {
    return { state: "WEAK", missing, evidenceIds };
  }
  if (relevant.length === 2) {
    return { state: "MODERATE", missing, evidenceIds };
  }
  if (relevant.length >= 3) {
    const verified = relevant.filter((e) => e.props.verificationStatus === "VERIFIED");
    return {
      state: verified.length >= 2 ? "VALIDATED" : "STRONG",
      missing,
      evidenceIds,
    };
  }
  return { state: "INSUFFICIENT_EVIDENCE", missing, evidenceIds };
}

function stateToScore(state: ValueDimensionState, confidence: number): number | undefined {
  const rank = STATE_RANK[state];
  if (rank === 0 && (state === "UNKNOWN" || state === "NOT_MEASURED" || state === "BLOCKED")) {
    return undefined;
  }
  const raw = (rank / 6) * 100;
  const ceiling = confidence * 100;
  return Math.min(raw, ceiling);
}

export type AssessVentureInput = Readonly<{
  assessmentId: string;
  ventureId: VentureId;
  stage: ValueStage;
  evidence: readonly ValueEvidence[];
  hypotheses: readonly ValueHypothesis[];
  metrics: readonly ValueMetric[];
  risks: readonly ValueRisk[];
  opportunities: readonly ValueOpportunity[];
  includeOptionalScore?: boolean;
}>;

export function assessVentureValue(input: AssessVentureInput): ValueAssessment {
  const stageDef = getStageDefinition(input.stage);
  const dimensions: DimensionAssessment[] = VALUE_DIMENSIONS.map((dimension) => {
    const inferred = inferState(
      dimension,
      input.evidence,
      input.hypotheses,
      input.metrics,
      input.risks,
      input.opportunities
    );
    const confBase =
      inferred.state === "UNKNOWN" || inferred.state === "NOT_MEASURED"
        ? 0.1
        : inferred.state === "HYPOTHESIS"
          ? 0.25
          : inferred.state === "WEAK"
            ? 0.4
            : inferred.state === "MODERATE"
              ? 0.55
              : inferred.state === "STRONG"
                ? 0.7
                : inferred.state === "VALIDATED"
                  ? 0.85
                  : inferred.state === "BLOCKED"
                    ? 0.2
                    : 0.3;
    const confResult = Confidence(Math.min(confBase, stageDef.confidenceCeiling));
    if (!confResult.ok) throw new Error(confResult.error.message);
    const confidence = confResult.value;
    const optionalScore = input.includeOptionalScore
      ? stateToScore(inferred.state, Number(confidence))
      : undefined;
    return {
      dimension,
      state: inferred.state,
      evidenceIds: inferred.evidenceIds,
      missingEvidence: inferred.missing,
      confidence,
      optionalScore,
      scoreFormula: optionalScore !== undefined
        ? `min(stateRank(${inferred.state})/6*100, confidence*100)`
        : undefined,
      scoreWeights: optionalScore !== undefined
        ? { stateRank: STATE_RANK[inferred.state] / 6, confidenceCeiling: confidence }
        : undefined,
      riskNote: inferred.state === "BLOCKED" ? "Blocking risk on this dimension" : undefined,
      recommendationNote:
        inferred.missing.length > 0 ? `Address: ${inferred.missing[0]}` : undefined,
    };
  });

  const missingEvidenceSummary = [
    ...new Set(dimensions.flatMap((d) => d.missingEvidence)),
  ];

  const confidences = dimensions.map((d) => Number(d.confidence));
  const overallConfidence = Math.min(
    confidences.reduce((a, b) => a + b, 0) / Math.max(confidences.length, 1),
    stageDef.confidenceCeiling
  );

  let optionalCompositeScore: number | undefined;
  let compositeFormula: string | undefined;
  if (input.includeOptionalScore) {
    const scored = dimensions.filter((d) => d.optionalScore !== undefined);
    const avg =
      scored.reduce((a, d) => a + (d.optionalScore ?? 0), 0) / Math.max(scored.length, 1);
    const ceiling = overallConfidence * 100;
    optionalCompositeScore = Math.min(avg, ceiling);
    compositeFormula =
      "min(avg(dimensionOptionalScores), overallConfidence*100); excludes UNKNOWN/NOT_MEASURED; not a portfolio rank";
  }

  const result = ValueAssessment.create({
    id: input.assessmentId,
    ventureId: input.ventureId,
    stage: input.stage,
    dimensions,
    overallConfidence,
    optionalCompositeScore,
    compositeFormula,
    missingEvidenceSummary,
  });
  if (!result.ok) throw new Error(result.error.message);
  return result.value;
}

export function deriveStageFromEvidence(
  evidence: readonly ValueEvidence[],
  metrics: readonly ValueMetric[]
): ValueStage {
  const types = uniqueTypes(evidence);
  const hasActualRevenue = metrics.some(
    (m) =>
      (m.props.kind === "MRR" || m.props.kind === "ARR" || m.props.kind === "PAYING_CUSTOMERS") &&
      m.props.valueType === "ACTUAL" &&
      ((m.props.numericValue ?? 0) > 0 || (m.props.moneyValue?.amount ?? 0) > 0)
  );
  if (hasActualRevenue || types.has("REVENUE_EVENT") || types.has("PAYING_CUSTOMER")) {
    return "REVENUE";
  }
  if (types.has("PILOT") || types.has("ACTIVE_USER")) return "PRODUCT_VALIDATION";
  if (types.has("LANDING_CONVERSION") || types.has("WAITLIST") || types.has("DEMO_REQUEST")) {
    return "MARKET_VALIDATION";
  }
  if (types.has("CUSTOMER_INTERVIEW") || types.has("SURVEY")) return "PROBLEM_VALIDATION";
  if (types.has("RESEARCH_SOURCE")) return "IDEA_VALUE";
  return "IDEA_VALUE";
}
