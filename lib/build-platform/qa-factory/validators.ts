import type {
  QaBlueprint,
  QaBlueprintValidation,
  QaBlueprintValidationIssue,
  QaFactoryInput,
} from "./types";

function issue(
  code: string,
  message: string,
  severity: QaBlueprintValidationIssue["severity"] = "warning"
): QaBlueprintValidationIssue {
  return { code, message, severity };
}

export function validateQaFactoryInput(input: QaFactoryInput): void {
  if (!input.context?.meta?.ventureId) {
    throw new Error("QaFactoryInput.context.meta.ventureId is required");
  }

  if (!input.dna?.productType) {
    throw new Error("QaFactoryInput.dna.productType is required");
  }

  if (!input.registry || !Array.isArray(input.registry.entries)) {
    throw new Error("QaFactoryInput.registry.entries must be an array");
  }
}

export function validateQaBlueprint(
  blueprint: Omit<QaBlueprint, "validation">
): QaBlueprintValidation {
  const issues: QaBlueprintValidationIssue[] = [];

  if (blueprint.testPlan.suites.length === 0) {
    issues.push(issue("TEST_PLAN_EMPTY", "Test plan has no suites", "error"));
  }

  if (blueprint.playwright.scenarios.length === 0) {
    issues.push(issue("PLAYWRIGHT_EMPTY", "No Playwright scenarios were generated", "error"));
  }

  if (blueprint.unitTests.testCases.length === 0) {
    issues.push(issue("UNIT_TESTS_EMPTY", "No unit test cases were generated", "error"));
  }

  if (blueprint.integrationTests.testCases.length === 0) {
    issues.push(issue("INTEGRATION_TESTS_EMPTY", "No integration test cases were generated", "error"));
  }

  if (blueprint.accessibility.checkpoints.length === 0) {
    issues.push(issue("A11Y_EMPTY", "No accessibility checkpoints were generated", "error"));
  }

  if (blueprint.performance.scenarios.length === 0) {
    issues.push(issue("PERFORMANCE_EMPTY", "No performance scenarios were generated", "error"));
  }

  if (blueprint.security.testCases.length === 0) {
    issues.push(issue("SECURITY_EMPTY", "No security test cases were generated", "error"));
  }

  if (blueprint.regression.suites.length === 0) {
    issues.push(issue("REGRESSION_EMPTY", "No regression suites were generated", "error"));
  }

  if (!blueprint.testPlan.suites.some((suite) => suite.type === "e2e")) {
    issues.push(issue("E2E_SUITE_MISSING", "Test plan should include an E2E suite"));
  }

  if (!blueprint.playwright.scenarios.some((scenario) => scenario.route === "/")) {
    issues.push(issue("PW_HOME_MISSING", "Playwright should include a home route scenario"));
  }

  return {
    valid: issues.every((current) => current.severity !== "error"),
    issues,
  };
}
