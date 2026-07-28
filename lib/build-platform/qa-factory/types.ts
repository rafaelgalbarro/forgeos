import type { BuildContext } from "@/lib/build-platform/build-context/types";

export type QaPlanStatus = "draft" | "ready";
export type TestPriority = "critical" | "high" | "medium" | "low";
export type TestSuiteType =
  | "unit"
  | "integration"
  | "e2e"
  | "a11y"
  | "performance"
  | "security"
  | "regression";

export interface QaFactoryInput {
  context: BuildContext;
  dna: QaBuildDna;
  registry: QaBuildRegistry;
}

export interface QaBlueprintMeta {
  ventureId: string;
  ventureName: string;
  generatedAt: string;
  version: string;
  status: QaPlanStatus;
}

export interface TestSuiteRef {
  id: string;
  name: string;
  type: TestSuiteType;
  priority: TestPriority;
}

export interface TestPlanSpec {
  id: string;
  title: string;
  objectives: string[];
  suites: TestSuiteRef[];
  coverageTargets: { unit: number; integration: number; e2e: number };
  ciGates: string[];
}

export interface PlaywrightScenario {
  id: string;
  name: string;
  route: string;
  steps: string[];
  assertions: string[];
}

export interface PlaywrightSpec {
  id: string;
  framework: string;
  configPath: string;
  scenarios: PlaywrightScenario[];
  browsers: string[];
}

export interface UnitTestCase {
  id: string;
  module: string;
  description: string;
  testType: "pure" | "hook" | "component";
}

export interface UnitTestSpec {
  id: string;
  framework: string;
  testCases: UnitTestCase[];
  mockStrategy: string[];
}

export interface IntegrationTestCase {
  id: string;
  endpoint: string;
  method: string;
  description: string;
  dependencies: string[];
}

export interface IntegrationTestSpec {
  id: string;
  framework: string;
  testCases: IntegrationTestCase[];
  fixtures: string[];
}

export interface A11yCheckpoint {
  id: string;
  wcagCriterion: string;
  target: string;
  tool: string;
}

export interface A11ySpec {
  id: string;
  standard: string;
  checkpoints: A11yCheckpoint[];
  scanRoutes: string[];
}

export interface PerformanceBudget {
  metric: string;
  threshold: string;
}

export interface PerformanceScenario {
  id: string;
  name: string;
  route: string;
  budgets: PerformanceBudget[];
}

export interface PerformanceSpec {
  id: string;
  tool: string;
  scenarios: PerformanceScenario[];
}

export interface SecurityTestCase {
  id: string;
  category: string;
  description: string;
  severity: "critical" | "high" | "medium";
}

export interface SecurityTestSpec {
  id: string;
  scanTools: string[];
  testCases: SecurityTestCase[];
  complianceChecks: string[];
}

export interface RegressionSuite {
  id: string;
  name: string;
  trigger: "pr" | "release" | "nightly";
  testIds: string[];
}

export interface RegressionSpec {
  id: string;
  suites: RegressionSuite[];
  baselineStrategy: string;
}

export interface QaBlueprintValidationIssue {
  code: string;
  message: string;
  severity: "warning" | "error";
}

export interface QaBlueprintValidation {
  valid: boolean;
  issues: QaBlueprintValidationIssue[];
}

export interface QaBlueprint {
  meta: QaBlueprintMeta;
  testPlan: TestPlanSpec;
  playwright: PlaywrightSpec;
  unitTests: UnitTestSpec;
  integrationTests: IntegrationTestSpec;
  accessibility: A11ySpec;
  performance: PerformanceSpec;
  security: SecurityTestSpec;
  regression: RegressionSpec;
  validation: QaBlueprintValidation;
}

export interface QaBuildDna {
  productType: string;
  testingFramework: string;
  unitCoverageMin: number;
  integrationRequired: boolean;
  e2eRequired: boolean;
  complexity: "low" | "medium" | "high";
  modules: string[];
  securityLevel: "standard" | "elevated";
}

export interface QaRegistryEntry {
  id: string;
  name: string;
  category: "generator" | "artifact" | "template" | "worker" | "provider";
  tags: string[];
}

export interface QaBuildRegistry {
  entries: QaRegistryEntry[];
  testGenerators: string[];
  requiredRoutes: string[];
}
