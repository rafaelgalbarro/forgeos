/**
 * PROGRAM 6120 — Venture Value Creation Engine — shared enums & primitives.
 * Extends Venture/Mission; does not redefine them.
 */

import type { Confidence, IsoTimestamp, Money } from "../shared/value-objects";

/** Independent value dimensions — never collapsed into one opaque score. */
export type ValueDimension =
  | "MARKET_OPPORTUNITY"
  | "PROBLEM_EVIDENCE"
  | "CUSTOMER_EVIDENCE"
  | "SOLUTION_EVIDENCE"
  | "PRODUCT_READINESS"
  | "GO_TO_MARKET_READINESS"
  | "TRACTION"
  | "REVENUE"
  | "UNIT_ECONOMICS"
  | "OPERATING_READINESS"
  | "SCALABILITY"
  | "DEFENSIBILITY"
  | "RISK"
  | "EXECUTION_CONFIDENCE";

export const VALUE_DIMENSIONS: readonly ValueDimension[] = [
  "MARKET_OPPORTUNITY",
  "PROBLEM_EVIDENCE",
  "CUSTOMER_EVIDENCE",
  "SOLUTION_EVIDENCE",
  "PRODUCT_READINESS",
  "GO_TO_MARKET_READINESS",
  "TRACTION",
  "REVENUE",
  "UNIT_ECONOMICS",
  "OPERATING_READINESS",
  "SCALABILITY",
  "DEFENSIBILITY",
  "RISK",
  "EXECUTION_CONFIDENCE",
] as const;

/** Evidence / measurement state per dimension (Program 6100 value-ready vocabulary). */
export type ValueDimensionState =
  | "UNKNOWN"
  | "NOT_MEASURED"
  | "INSUFFICIENT_EVIDENCE"
  | "HYPOTHESIS"
  | "WEAK"
  | "MODERATE"
  | "STRONG"
  | "VALIDATED"
  | "INVALIDATED"
  | "BLOCKED"
  | "NOT_APPLICABLE";

export const VALUE_DIMENSION_STATES: readonly ValueDimensionState[] = [
  "UNKNOWN",
  "NOT_MEASURED",
  "INSUFFICIENT_EVIDENCE",
  "HYPOTHESIS",
  "WEAK",
  "MODERATE",
  "STRONG",
  "VALIDATED",
  "INVALIDATED",
  "BLOCKED",
  "NOT_APPLICABLE",
] as const;

export type ValueStage =
  | "IDEA_VALUE"
  | "PROBLEM_VALIDATION"
  | "SOLUTION_VALIDATION"
  | "PRODUCT_VALIDATION"
  | "MARKET_VALIDATION"
  | "LAUNCH_READINESS"
  | "TRACTION"
  | "REVENUE"
  | "PROFITABILITY"
  | "SCALE";

export const VALUE_STAGES: readonly ValueStage[] = [
  "IDEA_VALUE",
  "PROBLEM_VALIDATION",
  "SOLUTION_VALIDATION",
  "PRODUCT_VALIDATION",
  "MARKET_VALIDATION",
  "LAUNCH_READINESS",
  "TRACTION",
  "REVENUE",
  "PROFITABILITY",
  "SCALE",
] as const;

export type EvidenceType =
  | "RESEARCH_SOURCE"
  | "CUSTOMER_INTERVIEW"
  | "SURVEY"
  | "WAITLIST"
  | "LANDING_CONVERSION"
  | "DEMO_REQUEST"
  | "LETTER_OF_INTENT"
  | "PILOT"
  | "ACTIVE_USER"
  | "PAYING_CUSTOMER"
  | "REVENUE_EVENT"
  | "RETENTION_EVENT"
  | "COST_EVENT"
  | "EXPERIMENT_RESULT"
  | "OPERATIONAL_RESULT"
  | "EXTERNAL_VALIDATION";

export type EvidenceReliability = "LOW" | "MEDIUM" | "HIGH" | "VERIFIED";
export type EvidenceDerivation = "DIRECT" | "INFERRED";
export type EvidenceVerificationStatus =
  | "UNVERIFIED"
  | "PENDING_REVIEW"
  | "VERIFIED"
  | "REJECTED";

/** Metric value provenance — never promote ESTIMATED/PROJECTED to ACTUAL. */
export type MetricValueType = "ACTUAL" | "ESTIMATED" | "PROJECTED" | "TARGET" | "UNKNOWN";

export type ValueMetricKind =
  | "INTERVIEWS_DONE"
  | "PROBLEM_CONFIRMED"
  | "PURCHASE_INTENT"
  | "WAITLIST"
  | "CONVERSION_RATE"
  | "DEMOS_REQUESTED"
  | "PILOTS"
  | "ACTIVE_USERS"
  | "PAYING_CUSTOMERS"
  | "MRR"
  | "ARR"
  | "CHURN"
  | "RETENTION"
  | "CAC"
  | "LTV"
  | "GROSS_MARGIN"
  | "BURN"
  | "RUNWAY"
  | "PAYBACK"
  | "ACTIVATION"
  | "ENGAGEMENT"
  | "NPS"
  | "TIME_TO_VALUE"
  | "OPERATING_COST"
  | "CUSTOM";

export type MilestoneStatus =
  | "NOT_STARTED"
  | "IN_PROGRESS"
  | "AT_RISK"
  | "BLOCKED"
  | "COMPLETED"
  | "CANCELLED";

export type ExperimentState =
  | "DRAFT"
  | "PLANNED"
  | "RUNNING"
  | "COMPLETED"
  | "INVALID"
  | "CANCELLED";

export type ExperimentType =
  | "INTERVIEW"
  | "LANDING_PAGE"
  | "WAITLIST"
  | "PRICING_TEST"
  | "PAID_CAMPAIGN"
  | "OUTREACH"
  | "DEMO"
  | "PILOT"
  | "CONCIERGE_MVP"
  | "PRODUCT_TEST"
  | "RETENTION_TEST"
  | "UNIT_ECONOMICS_TEST";

export type RecommendationType =
  | "CONTINUE"
  | "VALIDATE_FIRST"
  | "BUILD_LESS"
  | "LAUNCH"
  | "INVEST_MORE"
  | "REDUCE_INVESTMENT"
  | "PIVOT"
  | "PAUSE"
  | "MERGE"
  | "REUSE_ASSET"
  | "CLOSE"
  | "ESCALATE_FOR_REVIEW";

/** Irreversible / high-impact recommendations that MUST NOT auto-execute. */
export const REQUIRES_APPROVAL_RECOMMENDATIONS: readonly RecommendationType[] = [
  "PAUSE",
  "PIVOT",
  "MERGE",
  "CLOSE",
] as const;

export type RecommendationApprovalStatus =
  | "DRAFT"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "REJECTED"
  | "SUPERSEDED";

export type RiskSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type OpportunityMagnitude = "LOW" | "MEDIUM" | "HIGH";

export type TypedMoneyValue = Readonly<{
  money: Money;
  period?: string;
  source: string;
  valueType: MetricValueType;
  confidence: Confidence;
  updatedAt: IsoTimestamp;
}>;

export type DimensionAssessment = Readonly<{
  dimension: ValueDimension;
  state: ValueDimensionState;
  evidenceIds: readonly string[];
  missingEvidence: readonly string[];
  confidence: Confidence;
  /** Optional transparent score 0–100; must not exceed available confidence * 100. */
  optionalScore?: number;
  scoreFormula?: string;
  scoreWeights?: Readonly<Record<string, number>>;
  riskNote?: string;
  recommendationNote?: string;
}>;

export type StageDefinition = Readonly<{
  stage: ValueStage;
  entryCriteria: readonly string[];
  requiredEvidence: readonly EvidenceType[];
  exitCriteria: readonly string[];
  blockingRisks: readonly string[];
  recommendedExperiments: readonly ExperimentType[];
  /** Baseline confidence ceiling when only entry criteria met. */
  confidenceCeiling: number;
}>;
