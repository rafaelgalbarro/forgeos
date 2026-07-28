/** Build DNA — type contracts (Epic 6.1). */

export type BuildDnaValidationSeverity = "info" | "warning" | "error";

export interface BuildDnaValidationIssue {
  code: string;
  message: string;
  severity: BuildDnaValidationSeverity;
  field?: string;
}

export interface BuildDnaValidationResult {
  valid: boolean;
  completenessScore: number;
  issues: BuildDnaValidationIssue[];
}

export interface BuildDnaMeta {
  ventureId: string;
  ventureName: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  completenessScore: number;
  readyForGeneration: boolean;
}

export interface TechnologyStack {
  framework: string;
  backend: string;
  frontend: string;
  database: string;
  auth: string;
  payments: string;
  email: string;
  analytics: string;
  testing: string;
  cicd: string;
  deployment: string;
  monitoring: string;
}

export type TechnologyStackKey = keyof TechnologyStack;

export const TECHNOLOGY_STACK_KEYS: TechnologyStackKey[] = [
  "framework",
  "backend",
  "frontend",
  "database",
  "auth",
  "payments",
  "email",
  "analytics",
  "testing",
  "cicd",
  "deployment",
  "monitoring",
];

export const TECHNOLOGY_STACK_LABELS: Record<TechnologyStackKey, string> = {
  framework: "Framework",
  backend: "Backend",
  frontend: "Frontend",
  database: "Database",
  auth: "Auth",
  payments: "Payments",
  email: "Email",
  analytics: "Analytics",
  testing: "Testing",
  cicd: "CI/CD",
  deployment: "Deployment",
  monitoring: "Monitoring",
};

export interface CodingStandards {
  codingStyle: string;
  namingConvention: string;
}

export interface PerformanceBudget {
  maxBundleKb: number;
  maxLcpMs: number;
  maxApiLatencyMs: number;
}

export interface FeatureFlagsConfig {
  enabled: boolean;
  provider: string;
}

export interface ArchitectureRules {
  architecture: string;
  ddd: boolean;
  cleanArchitecture: boolean;
  hexagonal: boolean;
  featureFlags: FeatureFlagsConfig;
  performanceBudget: PerformanceBudget;
}

export interface SecurityRules {
  rules: string[];
  oauthRequired: boolean;
  encryptDataAtRest: boolean;
  encryptDataInTransit: boolean;
}

export interface TestingRules {
  unitCoverageMin: number;
  integrationRequired: boolean;
  e2eRequired: boolean;
  rules: string[];
}

export interface DeploymentRules {
  environments: string[];
  rollbackStrategy: string;
  rules: string[];
}

export interface BrandingRules {
  primaryColor: string;
  fontFamily: string;
  rules: string[];
}

export interface BuildDnaOverrides {
  stack?: Partial<TechnologyStack>;
  codingStandards?: Partial<CodingStandards>;
  architecture?: Partial<ArchitectureRules>;
  security?: Partial<SecurityRules>;
  testing?: Partial<TestingRules>;
  deployment?: Partial<DeploymentRules>;
  branding?: Partial<BrandingRules>;
}

export interface BuildDna {
  meta: BuildDnaMeta;
  stack: TechnologyStack;
  codingStandards: CodingStandards;
  architecture: ArchitectureRules;
  security: SecurityRules;
  testing: TestingRules;
  deployment: DeploymentRules;
  branding: BrandingRules;
}

export interface BuildDnaBuilderInput {
  ventureId: string;
  ventureName: string;
  overrides?: BuildDnaOverrides;
}
