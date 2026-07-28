import type { BuildContext } from "@/lib/build-platform/build-context";
import { validateBuildContext } from "@/lib/build-platform/build-context";
import { validateBuildDna } from "@/lib/build-platform/build-dna";
import type { BuildDna } from "@/lib/build-platform/build-dna";
import type { QualityGateResult, ReleaseArtifacts } from "./types";

function gate(
  id: string,
  label: string,
  passed: boolean,
  message: string,
  blocking = true,
  warn = false,
): QualityGateResult {
  return {
    id,
    label,
    status: passed ? "pass" : warn ? "warn" : "fail",
    message,
    blocking: passed ? false : blocking,
  };
}

function collectContextIssues(context: BuildContext) {
  const validated = validateBuildContext(context);
  return Object.values(validated.sections).flatMap((section) => section.validation.issues);
}

export function evaluateQualityGates(
  context: BuildContext,
  dna: BuildDna,
  artifacts: ReleaseArtifacts,
): QualityGateResult[] {
  const contextIssues = collectContextIssues(context);
  const contextValid = !contextIssues.some((i) => i.severity === "error");
  const dnaValidation = validateBuildDna(dna);
  const blockingRisks = [
    ...contextIssues.filter((i) => i.severity === "error"),
    ...dnaValidation.issues.filter((i) => i.severity === "error"),
    ...(artifacts.frontendBlueprint?.validation.issues.filter((i) => i.severity === "error") ?? []),
    ...(artifacts.backendBlueprint?.validation.issues.filter((i) => i.severity === "error") ?? []),
    ...(artifacts.databaseBlueprint?.validation.issues.filter((i) => i.severity === "error") ?? []),
    ...(artifacts.qaPlan?.validation.issues.filter((i) => i.severity === "error") ?? []),
    ...(artifacts.infrastructureSpec?.validation.issues.filter((i) => i.severity === "error") ?? []),
  ];

  return [
    gate(
      "build-context-valid",
      "Build Context valid",
      contextValid,
      contextValid
        ? "Build Context passes validation."
        : `${contextIssues.length} context issue(s) detected.`,
    ),
    gate(
      "build-dna-valid",
      "Build DNA valid",
      dnaValidation.valid,
      dnaValidation.valid
        ? "Build DNA passes validation."
        : `${dnaValidation.issues.length} DNA issue(s) detected.`,
    ),
    gate(
      "frontend-blueprint-present",
      "Frontend blueprint present",
      Boolean(artifacts.frontendBlueprint),
      artifacts.frontendBlueprint
        ? "Frontend blueprint generated."
        : "Frontend blueprint missing.",
    ),
    gate(
      "backend-blueprint-present",
      "Backend blueprint present",
      Boolean(artifacts.backendBlueprint),
      artifacts.backendBlueprint
        ? "Backend blueprint generated."
        : "Backend blueprint missing.",
    ),
    gate(
      "database-blueprint-present",
      "Database blueprint present",
      Boolean(artifacts.databaseBlueprint),
      artifacts.databaseBlueprint
        ? "Database blueprint generated."
        : "Database blueprint missing.",
    ),
    gate(
      "qa-checklist-present",
      "QA checklist present",
      Boolean(artifacts.qaPlan && artifacts.qaPlan.testPlan.suites.length > 0),
      artifacts.qaPlan
        ? `${artifacts.qaPlan.testPlan.suites.length} QA suite(s) defined.`
        : "QA plan missing.",
    ),
    gate(
      "infrastructure-spec-present",
      "Infrastructure spec present",
      Boolean(artifacts.infrastructureSpec),
      artifacts.infrastructureSpec
        ? "Infrastructure spec generated."
        : "Infrastructure spec missing.",
    ),
    gate(
      "no-blocking-risks",
      "No blocking risks",
      blockingRisks.length === 0,
      blockingRisks.length === 0
        ? "No blocking validation errors across upstream artifacts."
        : `${blockingRisks.length} blocking risk(s) require resolution.`,
    ),
  ];
}

export function allBlockingGatesPassed(gates: QualityGateResult[]): boolean {
  return gates.filter((g) => g.blocking).every((g) => g.status === "pass");
}
