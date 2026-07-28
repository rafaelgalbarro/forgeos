import type { QaFactoryInput, UnitTestCase, UnitTestSpec } from "./types";

export function generateUnitTestPlan(input: QaFactoryInput): UnitTestSpec {
  const { dna, context } = input;
  const framework = dna.testingFramework.includes("jest") ? "jest" : "vitest";

  const moduleCases: UnitTestCase[] = dna.modules.map((module) => ({
    id: `unit-${module}`,
    module: `lib/${module}`,
    description: `Domain logic and utilities for ${module} module`,
    testType: "pure" as const,
  }));

  const baseCases: UnitTestCase[] = [
    {
      id: "unit-context-adapter",
      module: "lib/build-platform/build-context",
      description: "Context adapter normalizes venture data into build context",
      testType: "pure",
    },
    {
      id: "unit-dna-builder",
      module: "lib/build-platform/build-dna",
      description: "DNA builder produces valid technology stack from context",
      testType: "pure",
    },
    {
      id: "unit-fhis-button",
      module: "components/ui/fhis/Button",
      description: "Button renders variants and handles click events",
      testType: "component",
    },
    {
      id: "unit-venture-validation",
      module: `lib/domain/venture`,
      description: `Validation rules for ${context.meta.ventureName} venture model`,
      testType: "pure",
    },
  ];

  return {
    id: "unit-tests-main",
    framework,
    testCases: [...baseCases, ...moduleCases],
    mockStrategy: [
      "Mock external API calls with MSW or vi.mock",
      "Use in-memory fixtures for database access",
      "Stub Next.js router and navigation hooks in component tests",
      "Isolate pure functions — no I/O in unit test scope",
    ],
  };
}
