import type { QaFactoryInput, TestPlanSpec } from "./types";

export function generateTestPlan(input: QaFactoryInput): TestPlanSpec {
  const { context, dna } = input;
  const ventureName = context.meta.ventureName;

  return {
    id: "test-plan-main",
    title: `${ventureName} QA Test Plan`,
    objectives: [
      `Validate core ${dna.productType} user journeys end-to-end`,
      `Achieve minimum ${dna.unitCoverageMin}% unit coverage on domain logic`,
      "Ensure API contracts remain stable across releases",
      "Verify accessibility compliance on public and workspace surfaces",
      "Establish performance budgets for critical routes",
    ],
    suites: [
      { id: "suite-unit", name: "Unit Tests", type: "unit", priority: "high" },
      { id: "suite-integration", name: "Integration Tests", type: "integration", priority: "high" },
      { id: "suite-e2e", name: "Playwright E2E", type: "e2e", priority: "critical" },
      { id: "suite-a11y", name: "Accessibility Scans", type: "a11y", priority: "medium" },
      { id: "suite-perf", name: "Performance Budgets", type: "performance", priority: "medium" },
      { id: "suite-security", name: "Security Checks", type: "security", priority: dna.securityLevel === "elevated" ? "critical" : "high" },
      { id: "suite-regression", name: "Regression Suite", type: "regression", priority: "critical" },
    ],
    coverageTargets: {
      unit: dna.unitCoverageMin,
      integration: dna.integrationRequired ? 60 : 40,
      e2e: dna.e2eRequired ? 80 : 50,
    },
    ciGates: [
      "All unit tests pass",
      "Integration tests pass against staging",
      dna.e2eRequired ? "Playwright smoke suite passes on PR" : "Playwright smoke suite passes on release",
      "No critical accessibility violations",
      "Performance budgets within threshold",
      dna.securityLevel === "elevated" ? "Security scan: zero critical findings" : "Security scan: no new high findings",
    ],
  };
}
