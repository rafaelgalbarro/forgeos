import type {
  ReadinessStatus,
  RealityClassification,
  ValidationStatus,
} from "./read-model";

export function normalizeReadiness(input: string | null | undefined): ReadinessStatus {
  const value = (input || "").toUpperCase();
  if (!value) return "NOT_STARTED";
  if (value.includes("FAIL")) return "FAILED";
  if (value.includes("BLOCK")) return "BLOCKED";
  if (value.includes("READY") || value.includes("APPROVED") || value.includes("PUBLISHED")) return "READY";
  if (value.includes("PLAN")) return "PLANNED";
  if (value.includes("RUN") || value.includes("BUILD") || value.includes("PROGRESS")) return "IN_PROGRESS";
  if (value.includes("PARTIAL") || value.includes("DEGRADED")) return "PARTIAL";
  return "NOT_STARTED";
}

export function normalizeValidation(input: string | null | undefined): ValidationStatus {
  const value = (input || "").toUpperCase();
  if (!value) return "NOT_RUN";
  if (value === "PASS" || value === "PASSED") return "PASS";
  if (value === "WARN" || value === "WARNING") return "WARNING";
  if (value === "FAIL" || value === "FAILED") return "FAIL";
  if (value === "SKIP" || value === "NOT_APPLICABLE") return "NOT_APPLICABLE";
  return "NOT_RUN";
}

export function classifyReality(input: {
  hasRealPreview: boolean;
  hasFunctionalDeployment: boolean;
  hasApprovedRelease: boolean;
  hasGeneratedOutput: boolean;
  hasValidation: boolean;
  hasPlanOnly: boolean;
  hasDryRun: boolean;
  blocked: boolean;
  failed: boolean;
}): RealityClassification {
  if (input.failed) return "FAILED";
  if (input.blocked) return "BLOCKED";
  if (input.hasFunctionalDeployment) return "REAL_AND_FUNCTIONAL";
  if (input.hasRealPreview) return "REAL_PREVIEW";
  if (input.hasApprovedRelease && input.hasValidation) return "GENERATED_AND_VALIDATED";
  if (input.hasGeneratedOutput) return "GENERATED_NOT_EXECUTED";
  if (input.hasDryRun) return "DRY_RUN";
  if (input.hasPlanOnly) return "PLAN_ONLY";
  return "SPECIFICATION_ONLY";
}
