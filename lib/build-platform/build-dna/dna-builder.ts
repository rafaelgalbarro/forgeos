/** Assemble Build DNA from platform defaults + venture overrides (Epic 6.1). */

import { DEFAULT_ARCHITECTURE_RULES } from "./architecture-rules";
import { refreshBuildDnaMeta, createBuildDnaMeta } from "./build-dna";
import { DEFAULT_BRANDING_RULES } from "./branding-rules";
import { DEFAULT_CODING_STANDARDS } from "./coding-standards";
import { DEFAULT_DEPLOYMENT_RULES } from "./deployment-rules";
import { validateBuildDna } from "./dna-validator";
import { DEFAULT_SECURITY_RULES } from "./security-rules";
import { DEFAULT_TECHNOLOGY_STACK } from "./technology-stack";
import { DEFAULT_TESTING_RULES } from "./testing-rules";
import type { BuildDna, BuildDnaBuilderInput } from "./types";

function mergeArchitecture(
  overrides?: BuildDnaBuilderInput["overrides"],
): BuildDna["architecture"] {
  const arch = overrides?.architecture;
  if (!arch) return { ...DEFAULT_ARCHITECTURE_RULES };

  return {
    ...DEFAULT_ARCHITECTURE_RULES,
    ...arch,
    featureFlags: {
      ...DEFAULT_ARCHITECTURE_RULES.featureFlags,
      ...arch.featureFlags,
    },
    performanceBudget: {
      ...DEFAULT_ARCHITECTURE_RULES.performanceBudget,
      ...arch.performanceBudget,
    },
  };
}

function mergeSecurity(overrides?: BuildDnaBuilderInput["overrides"]): BuildDna["security"] {
  const sec = overrides?.security;
  if (!sec) return { ...DEFAULT_SECURITY_RULES, rules: [...DEFAULT_SECURITY_RULES.rules] };

  return {
    ...DEFAULT_SECURITY_RULES,
    ...sec,
    rules: sec.rules ?? [...DEFAULT_SECURITY_RULES.rules],
  };
}

function mergeTesting(overrides?: BuildDnaBuilderInput["overrides"]): BuildDna["testing"] {
  const test = overrides?.testing;
  if (!test) return { ...DEFAULT_TESTING_RULES, rules: [...DEFAULT_TESTING_RULES.rules] };

  return {
    ...DEFAULT_TESTING_RULES,
    ...test,
    rules: test.rules ?? [...DEFAULT_TESTING_RULES.rules],
  };
}

function mergeDeployment(
  overrides?: BuildDnaBuilderInput["overrides"],
): BuildDna["deployment"] {
  const dep = overrides?.deployment;
  if (!dep) return { ...DEFAULT_DEPLOYMENT_RULES, rules: [...DEFAULT_DEPLOYMENT_RULES.rules] };

  return {
    ...DEFAULT_DEPLOYMENT_RULES,
    ...dep,
    environments: dep.environments ?? [...DEFAULT_DEPLOYMENT_RULES.environments],
    rules: dep.rules ?? [...DEFAULT_DEPLOYMENT_RULES.rules],
  };
}

function mergeBranding(overrides?: BuildDnaBuilderInput["overrides"]): BuildDna["branding"] {
  const brand = overrides?.branding;
  if (!brand) return { ...DEFAULT_BRANDING_RULES, rules: [...DEFAULT_BRANDING_RULES.rules] };

  return {
    ...DEFAULT_BRANDING_RULES,
    ...brand,
    rules: brand.rules ?? [...DEFAULT_BRANDING_RULES.rules],
  };
}

export function buildDna(input: BuildDnaBuilderInput): BuildDna {
  const { ventureId, ventureName, overrides } = input;

  const draft: BuildDna = {
    meta: createBuildDnaMeta(ventureId, ventureName),
    stack: { ...DEFAULT_TECHNOLOGY_STACK, ...overrides?.stack },
    codingStandards: { ...DEFAULT_CODING_STANDARDS, ...overrides?.codingStandards },
    architecture: mergeArchitecture(overrides),
    security: mergeSecurity(overrides),
    testing: mergeTesting(overrides),
    deployment: mergeDeployment(overrides),
    branding: mergeBranding(overrides),
  };

  const validation = validateBuildDna(draft);
  return refreshBuildDnaMeta(draft, validation.completenessScore, validation.valid);
}

export function buildDnaFromDefaults(ventureId: string, ventureName: string): BuildDna {
  return buildDna({ ventureId, ventureName });
}
