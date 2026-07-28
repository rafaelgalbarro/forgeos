import type { QaFactoryInput, RegressionSpec } from "./types";

export function generateRegressionPlan(input: QaFactoryInput): RegressionSpec {
  const { dna } = input;

  return {
    id: "regression-main",
    suites: [
      {
        id: "reg-pr-smoke",
        name: "PR Smoke Suite",
        trigger: "pr",
        testIds: ["pw-home", "pw-dashboard", "unit-context-adapter", "int-health"],
      },
      {
        id: "reg-release-full",
        name: "Release Full Regression",
        trigger: "release",
        testIds: [
          "pw-home",
          "pw-dashboard",
          "suite-unit",
          "suite-integration",
          "suite-a11y",
          "suite-perf",
          "suite-security",
        ],
      },
      {
        id: "reg-nightly",
        name: "Nightly Extended Suite",
        trigger: "nightly",
        testIds: dna.modules.flatMap((module) => [`unit-${module}`, `int-${module}`, `pw-${module}`]),
      },
    ],
    baselineStrategy:
      dna.complexity === "high"
        ? "Visual snapshots + API contract baselines on release branch"
        : "API contract baselines on main branch; visual snapshots optional",
  };
}
