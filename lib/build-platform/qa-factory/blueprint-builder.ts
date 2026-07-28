import { generateAccessibilityPlan } from "./accessibility-generator";
import { generateIntegrationTestPlan } from "./integration-test-generator";
import { generatePerformancePlan } from "./performance-generator";
import { generatePlaywrightPlan } from "./playwright-generator";
import { generateRegressionPlan } from "./regression-generator";
import { generateSecurityTestPlan } from "./security-test-generator";
import { generateTestPlan } from "./test-plan-generator";
import { generateUnitTestPlan } from "./unit-test-generator";
import type { QaBlueprint, QaFactoryInput } from "./types";

export function buildQaBlueprint(
  input: QaFactoryInput
): Omit<QaBlueprint, "validation"> {
  return {
    meta: {
      ventureId: input.context.meta.ventureId,
      ventureName: input.context.meta.ventureName,
      generatedAt: new Date().toISOString(),
      version: "6.6.0",
      status: "draft",
    },
    testPlan: generateTestPlan(input),
    playwright: generatePlaywrightPlan(input),
    unitTests: generateUnitTestPlan(input),
    integrationTests: generateIntegrationTestPlan(input),
    accessibility: generateAccessibilityPlan(input),
    performance: generatePerformancePlan(input),
    security: generateSecurityTestPlan(input),
    regression: generateRegressionPlan(input),
  };
}
