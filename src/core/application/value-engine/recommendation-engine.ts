/**
 * Value recommendation generation — PROGRAM 6120.
 * NEVER auto-executes PAUSE, PIVOT, MERGE, CLOSE.
 */

import {
  ValueRecommendation,
  type ValueAssessment,
  type ValueEvidence,
  type ValueMilestone,
  type ValueRecommendation as ValueRecommendationEntity,
  type VentureId,
} from "@/src/core/domain";

export type RecommendationContext = Readonly<{
  ventureId: VentureId;
  assessment: ValueAssessment;
  evidence: readonly ValueEvidence[];
  milestones: readonly ValueMilestone[];
  recommendationIdPrefix?: string;
}>;

export function generateValueRecommendations(
  ctx: RecommendationContext
): ValueRecommendationEntity[] {
  const out: ValueRecommendationEntity[] = [];
  const dims = ctx.assessment.props.dimensions;
  const missing = ctx.assessment.props.missingEvidenceSummary;
  const blocked = dims.filter((d) => d.state === "BLOCKED");
  const revenue = dims.find((d) => d.dimension === "REVENUE");
  const problem = dims.find((d) => d.dimension === "PROBLEM_EVIDENCE");
  const customer = dims.find((d) => d.dimension === "CUSTOMER_EVIDENCE");
  const opportunity = dims.find((d) => d.dimension === "MARKET_OPPORTUNITY");
  const prefix = ctx.recommendationIdPrefix ?? `rec-${String(ctx.ventureId)}`;
  let n = 0;
  const push = (r: ReturnType<typeof ValueRecommendation.create>) => {
    if (r.ok) out.push(r.value);
  };

  if (blocked.length > 0 || dims.some((d) => d.state === "INSUFFICIENT_EVIDENCE" && d.dimension === "CUSTOMER_EVIDENCE" && ctx.evidence.length === 0)) {
    push(
      ValueRecommendation.create({
        id: `${prefix}-${++n}`,
        ventureId: ctx.ventureId,
        type: "ESCALATE_FOR_REVIEW",
        reason: blocked.length
          ? `Blocked dimensions: ${blocked.map((b) => b.dimension).join(", ")}`
          : "Insufficient customer evidence — escalate for human review before further build spend",
        evidenceIds: ctx.evidence.map((e) => e.id),
        confidence: 0.6,
        expectedBenefit: "Prevent resource destruction without validation path",
        risk: "Continued spend without evidence",
        reversibility: "REVERSIBLE",
      })
    );
  }

  if (
    opportunity &&
    (opportunity.state === "STRONG" || opportunity.state === "HYPOTHESIS") &&
    problem &&
    (problem.state === "UNKNOWN" ||
      problem.state === "NOT_MEASURED" ||
      problem.state === "HYPOTHESIS" ||
      problem.state === "INSUFFICIENT_EVIDENCE")
  ) {
    push(
      ValueRecommendation.create({
        id: `${prefix}-${++n}`,
        ventureId: ctx.ventureId,
        type: "VALIDATE_FIRST",
        reason:
          "Market opportunity appears strong but problem/customer validation evidence is missing or weak",
        evidenceIds: ctx.evidence.map((e) => e.id),
        confidence: Number(opportunity.confidence),
        expectedBenefit: "Confirm problem before scaling build investment",
        risk: "Opportunity hypothesis may be wrong",
        reversibility: "REVERSIBLE",
      })
    );
    push(
      ValueRecommendation.create({
        id: `${prefix}-${++n}`,
        ventureId: ctx.ventureId,
        type: "BUILD_LESS",
        reason: "Prefer validation experiments over additional product delivery while evidence is thin",
        confidence: 0.55,
        expectedBenefit: "Lower burn while gathering evidence",
        risk: "Slower feature velocity",
        reversibility: "REVERSIBLE",
      })
    );
  }

  if (
    customer &&
    (customer.state === "MODERATE" || customer.state === "STRONG" || customer.state === "VALIDATED") &&
    ctx.evidence.some((e) => e.props.type === "CUSTOMER_INTERVIEW")
  ) {
    push(
      ValueRecommendation.create({
        id: `${prefix}-${++n}`,
        ventureId: ctx.ventureId,
        type: "CONTINUE",
        reason: "Customer interview evidence supports continued validation path",
        evidenceIds: ctx.evidence
          .filter((e) => e.props.type === "CUSTOMER_INTERVIEW")
          .map((e) => e.id),
        confidence: Number(customer.confidence),
        expectedBenefit: "Deepen problem/solution fit learning",
        risk: "Interview bias",
        reversibility: "REVERSIBLE",
      })
    );
  }

  if (
    ctx.evidence.some((e) => e.props.type === "LANDING_CONVERSION" || e.props.type === "WAITLIST")
  ) {
    push(
      ValueRecommendation.create({
        id: `${prefix}-${++n}`,
        ventureId: ctx.ventureId,
        type: "CONTINUE",
        reason: "Landing/waitlist signals present — continue market validation experiments",
        evidenceIds: ctx.evidence
          .filter((e) => e.props.type === "LANDING_CONVERSION" || e.props.type === "WAITLIST")
          .map((e) => e.id),
        confidence: 0.5,
        expectedBenefit: "Convert interest into demos/pilots",
        risk: "Signup vanity without intent",
        reversibility: "REVERSIBLE",
      })
    );
  }

  if (ctx.evidence.some((e) => e.props.type === "PILOT")) {
    push(
      ValueRecommendation.create({
        id: `${prefix}-${++n}`,
        ventureId: ctx.ventureId,
        type: "INVEST_MORE",
        reason: "Pilot evidence exists — targeted investment to convert pilot learnings",
        evidenceIds: ctx.evidence.filter((e) => e.props.type === "PILOT").map((e) => e.id),
        confidence: 0.55,
        expectedBenefit: "Move toward launch readiness with real usage context",
        risk: "Pilot may not generalize",
        reversibility: "PARTIALLY_REVERSIBLE",
      })
    );
  }

  if (ctx.evidence.length === 0) {
    push(
      ValueRecommendation.create({
        id: `${prefix}-${++n}`,
        ventureId: ctx.ventureId,
        type: "VALIDATE_FIRST",
        reason: "No registered evidence — blocked from treating venture as validated or revenue-generating",
        confidence: 0.7,
        expectedBenefit: "Establish provenance before capital allocation",
        risk: "Resource destruction without evidence",
        reversibility: "REVERSIBLE",
      })
    );
    // High-impact recommendation requiring approval — NEVER auto-executed
    push(
      ValueRecommendation.create({
        id: `${prefix}-${++n}`,
        ventureId: ctx.ventureId,
        type: "PAUSE",
        reason: "Lack of evidence may warrant pause of incremental build spend pending review",
        confidence: 0.45,
        expectedBenefit: "Stop burn until validation plan exists",
        risk: "Momentum loss if pause is premature",
        reversibility: "REVERSIBLE",
      })
    );
  }

  if (revenue && revenue.state === "NOT_MEASURED") {
    // Do NOT invent CLOSE — only escalate. CLOSE requires approval if generated.
    push(
      ValueRecommendation.create({
        id: `${prefix}-${++n}`,
        ventureId: ctx.ventureId,
        type: "ESCALATE_FOR_REVIEW",
        reason: "Revenue not measured — do not invent MRR/customers; review economics honestly",
        confidence: 0.65,
        expectedBenefit: "Honest portfolio reporting",
        risk: "Pressure to fabricate vanity metrics",
        reversibility: "REVERSIBLE",
      })
    );
  }

  if (missing.length > 5 && ctx.milestones.every((m) => m.props.status !== "COMPLETED")) {
    push(
      ValueRecommendation.create({
        id: `${prefix}-${++n}`,
        ventureId: ctx.ventureId,
        type: "REDUCE_INVESTMENT",
        reason: `Many evidence gaps (${missing.length}) and no completed value milestones`,
        confidence: 0.5,
        expectedBenefit: "Preserve runway for evidence-producing work",
        risk: "Under-investment if opportunity is real",
        reversibility: "REVERSIBLE",
      })
    );
  }

  return out;
}

/** Hard gate: irreversible recommendations never auto-execute. */
export function assertNoAutomaticIrreversibleExecution(
  recommendation: ValueRecommendationEntity
): { allowed: false; reason: string } | { allowed: true } {
  if (recommendation.props.requiresApproval) {
    return {
      allowed: false,
      reason: `${recommendation.props.type} requires explicit ApproveValueRecommendation — never auto-executed`,
    };
  }
  if (!recommendation.canAutoExecute()) {
    return { allowed: false, reason: "Auto-execution not permitted" };
  }
  return { allowed: true };
}
