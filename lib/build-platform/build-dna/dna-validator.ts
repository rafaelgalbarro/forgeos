/** Validate Build DNA completeness and readiness (Epic 6.1). */

import {
  TECHNOLOGY_STACK_KEYS,
  TECHNOLOGY_STACK_LABELS,
  type BuildDna,
  type BuildDnaValidationIssue,
  type BuildDnaValidationResult,
} from "./types";

function issue(
  code: string,
  message: string,
  severity: BuildDnaValidationIssue["severity"],
  field?: string,
): BuildDnaValidationIssue {
  return { code, message, severity, field };
}

function isNonEmpty(value: string | undefined | null): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

export function validateBuildDna(dna: BuildDna): BuildDnaValidationResult {
  const issues: BuildDnaValidationIssue[] = [];
  let filled = 0;
  let total = 0;

  for (const key of TECHNOLOGY_STACK_KEYS) {
    total += 1;
    const value = dna.stack[key];
    if (isNonEmpty(value)) {
      filled += 1;
    } else {
      issues.push(
        issue(
          "STACK_MISSING",
          `${TECHNOLOGY_STACK_LABELS[key]} is required`,
          "error",
          `stack.${key}`,
        ),
      );
    }
  }

  total += 2;
  if (isNonEmpty(dna.codingStandards.codingStyle)) filled += 1;
  else issues.push(issue("CODING_STYLE_MISSING", "Coding style is required", "error", "codingStandards.codingStyle"));

  if (isNonEmpty(dna.codingStandards.namingConvention)) filled += 1;
  else
    issues.push(
      issue("NAMING_CONVENTION_MISSING", "Naming convention is required", "error", "codingStandards.namingConvention"),
    );

  total += 1;
  if (isNonEmpty(dna.architecture.architecture)) filled += 1;
  else issues.push(issue("ARCHITECTURE_MISSING", "Architecture description is required", "error", "architecture.architecture"));

  const archPatterns = [
    { key: "ddd", label: "DDD" },
    { key: "cleanArchitecture", label: "Clean Architecture" },
    { key: "hexagonal", label: "Hexagonal" },
  ] as const;

  for (const { key, label } of archPatterns) {
    total += 1;
    if (dna.architecture[key]) filled += 1;
    else issues.push(issue("ARCH_PATTERN_DISABLED", `${label} should be enabled`, "warning", `architecture.${key}`));
  }

  total += 2;
  if (dna.architecture.featureFlags.enabled && isNonEmpty(dna.architecture.featureFlags.provider)) filled += 2;
  else if (!dna.architecture.featureFlags.enabled) {
    issues.push(issue("FEATURE_FLAGS_DISABLED", "Feature flags are disabled", "warning", "architecture.featureFlags"));
    filled += 1;
  } else {
    issues.push(issue("FEATURE_FLAGS_PROVIDER_MISSING", "Feature flag provider is required", "error", "architecture.featureFlags.provider"));
  }

  const budget = dna.architecture.performanceBudget;
  total += 3;
  if (budget.maxBundleKb > 0) filled += 1;
  else issues.push(issue("PERF_BUDGET_BUNDLE", "Performance budget: max bundle size required", "error", "architecture.performanceBudget.maxBundleKb"));

  if (budget.maxLcpMs > 0) filled += 1;
  else issues.push(issue("PERF_BUDGET_LCP", "Performance budget: max LCP required", "error", "architecture.performanceBudget.maxLcpMs"));

  if (budget.maxApiLatencyMs > 0) filled += 1;
  else issues.push(issue("PERF_BUDGET_API", "Performance budget: max API latency required", "error", "architecture.performanceBudget.maxApiLatencyMs"));

  total += 1;
  if (dna.security.rules.length > 0) filled += 1;
  else issues.push(issue("SECURITY_RULES_EMPTY", "At least one security rule is required", "error", "security.rules"));

  total += 1;
  if (dna.testing.rules.length > 0) filled += 1;
  else issues.push(issue("TESTING_RULES_EMPTY", "At least one testing rule is required", "warning", "testing.rules"));

  total += 1;
  if (dna.deployment.environments.length > 0) filled += 1;
  else issues.push(issue("DEPLOYMENT_ENV_EMPTY", "At least one deployment environment is required", "error", "deployment.environments"));

  total += 1;
  if (isNonEmpty(dna.deployment.rollbackStrategy)) filled += 1;
  else issues.push(issue("ROLLBACK_MISSING", "Rollback strategy is required", "warning", "deployment.rollbackStrategy"));

  if (!dna.security.encryptDataInTransit) {
    issues.push(issue("SECURITY_TRANSIT", "Data in transit encryption should be enabled", "warning", "security.encryptDataInTransit"));
  }

  if (!dna.security.encryptDataAtRest) {
    issues.push(issue("SECURITY_REST", "Data at rest encryption should be enabled", "warning", "security.encryptDataAtRest"));
  }

  if (dna.testing.unitCoverageMin < 50) {
    issues.push(issue("TESTING_COVERAGE_LOW", "Unit coverage minimum below 50%", "warning", "testing.unitCoverageMin"));
  }

  const completenessScore = total > 0 ? Math.round((filled / total) * 100) : 0;
  const hasErrors = issues.some((i) => i.severity === "error");

  return {
    valid: !hasErrors && completenessScore >= 85,
    completenessScore,
    issues,
  };
}

export function validateBuildDnaField(dna: BuildDna, field: string): BuildDnaValidationIssue[] {
  return validateBuildDna(dna).issues.filter((i) => i.field === field);
}
