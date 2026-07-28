import type { IntegrationTestCase, IntegrationTestSpec, QaFactoryInput } from "./types";

export function generateIntegrationTestPlan(input: QaFactoryInput): IntegrationTestSpec {
  const { dna } = input;

  const apiCases: IntegrationTestCase[] = [
    {
      id: "int-health",
      endpoint: "/api/health",
      method: "GET",
      description: "Health endpoint returns ok status",
      dependencies: [],
    },
    {
      id: "int-build-context",
      endpoint: "/api/build-context",
      method: "POST",
      description: "Build context creation accepts venture payload",
      dependencies: ["build-context", "venture-store"],
    },
    {
      id: "int-build-dna",
      endpoint: "/api/build-dna",
      method: "POST",
      description: "Build DNA generation from context returns valid stack",
      dependencies: ["build-dna", "build-context"],
    },
  ];

  const moduleCases: IntegrationTestCase[] = dna.modules.map((module) => ({
    id: `int-${module}`,
    endpoint: `/api/${module}`,
    method: "GET",
    description: `${module} API route returns expected schema`,
    dependencies: [module, "database"],
  }));

  return {
    id: "integration-tests-main",
    framework: dna.testingFramework.includes("jest") ? "jest" : "vitest",
    testCases: [...apiCases, ...moduleCases],
    fixtures: [
      "tests/fixtures/venture-lab.json",
      "tests/fixtures/build-context-sample.json",
      "tests/fixtures/build-dna-sample.json",
      "tests/fixtures/registry-entries.json",
    ],
  };
}
