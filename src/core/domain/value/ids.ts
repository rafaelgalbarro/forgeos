/**
 * Branded IDs for Program 6120 value entities.
 */

import type { Brand } from "../shared/ids";

export type ValueHypothesisId = Brand<string, "ValueHypothesisId">;
export type ValueMetricId = Brand<string, "ValueMetricId">;
export type ValueEvidenceId = Brand<string, "ValueEvidenceId">;
export type ValueMilestoneId = Brand<string, "ValueMilestoneId">;
export type ValueExperimentId = Brand<string, "ValueExperimentId">;
export type ValueAssessmentId = Brand<string, "ValueAssessmentId">;
export type ValueRiskId = Brand<string, "ValueRiskId">;
export type ValueOpportunityId = Brand<string, "ValueOpportunityId">;
export type ValueRecommendationId = Brand<string, "ValueRecommendationId">;
export type ValueSnapshotId = Brand<string, "ValueSnapshotId">;
export type VentureEconomicsId = Brand<string, "VentureEconomicsId">;
export type VentureTractionId = Brand<string, "VentureTractionId">;
export type CustomerEvidenceId = Brand<string, "CustomerEvidenceId">;

function assertNonEmpty(value: string, label: string): string {
  const trimmed = value.trim();
  if (!trimmed) throw new Error(`${label} must be a non-empty string`);
  return trimmed;
}

export function asValueHypothesisId(value: string): ValueHypothesisId {
  return assertNonEmpty(value, "ValueHypothesisId") as ValueHypothesisId;
}
export function asValueMetricId(value: string): ValueMetricId {
  return assertNonEmpty(value, "ValueMetricId") as ValueMetricId;
}
export function asValueEvidenceId(value: string): ValueEvidenceId {
  return assertNonEmpty(value, "ValueEvidenceId") as ValueEvidenceId;
}
export function asValueMilestoneId(value: string): ValueMilestoneId {
  return assertNonEmpty(value, "ValueMilestoneId") as ValueMilestoneId;
}
export function asValueExperimentId(value: string): ValueExperimentId {
  return assertNonEmpty(value, "ValueExperimentId") as ValueExperimentId;
}
export function asValueAssessmentId(value: string): ValueAssessmentId {
  return assertNonEmpty(value, "ValueAssessmentId") as ValueAssessmentId;
}
export function asValueRiskId(value: string): ValueRiskId {
  return assertNonEmpty(value, "ValueRiskId") as ValueRiskId;
}
export function asValueOpportunityId(value: string): ValueOpportunityId {
  return assertNonEmpty(value, "ValueOpportunityId") as ValueOpportunityId;
}
export function asValueRecommendationId(value: string): ValueRecommendationId {
  return assertNonEmpty(value, "ValueRecommendationId") as ValueRecommendationId;
}
export function asValueSnapshotId(value: string): ValueSnapshotId {
  return assertNonEmpty(value, "ValueSnapshotId") as ValueSnapshotId;
}
export function asVentureEconomicsId(value: string): VentureEconomicsId {
  return assertNonEmpty(value, "VentureEconomicsId") as VentureEconomicsId;
}
export function asVentureTractionId(value: string): VentureTractionId {
  return assertNonEmpty(value, "VentureTractionId") as VentureTractionId;
}
export function asCustomerEvidenceId(value: string): CustomerEvidenceId {
  return assertNonEmpty(value, "CustomerEvidenceId") as CustomerEvidenceId;
}
