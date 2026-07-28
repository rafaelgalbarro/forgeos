/** Program 4300 — Cloud Foundation types */

export const CLOUD_FOUNDATION_VERSION = "Program 4300 — Cloud Foundation";

export type CloudEnvironment = "development" | "preview" | "staging" | "production";

export type CloudProvider = "github" | "vercel" | "cloudflare" | "supabase";

export type CloudHealthStatus = "healthy" | "degraded" | "critical" | "unknown" | "offline";

export type DeploymentStatus =
  | "pending"
  | "building"
  | "ready"
  | "deployed"
  | "failed"
  | "rolled_back";

export type BranchType = "main" | "develop" | "release" | "feature" | "hotfix";

export interface GitBranchRule {
  pattern: string;
  type: BranchType;
  protected: boolean;
  deployTarget?: CloudEnvironment;
  description: string;
}

export interface GitHubStrategy {
  defaultBranch: string;
  branches: GitBranchRule[];
  prRequired: boolean;
  requireStatusChecks: boolean;
  statusChecks: string[];
  releaseBranchPattern: string;
  featureBranchPattern: string;
}

export interface VercelEnvironmentMapping {
  environment: CloudEnvironment;
  vercelTarget: "development" | "preview" | "production";
  branch: string;
  autoDeploy: boolean;
  domain?: string;
  envVarPrefix?: string;
}

export interface VercelConfig {
  projectName: string;
  framework: string;
  previewOnly: boolean;
  productionBlocked: boolean;
  environments: VercelEnvironmentMapping[];
  buildCommand: string;
  outputDirectory: string;
}

export interface CloudflareDnsRecord {
  type: "A" | "AAAA" | "CNAME" | "TXT";
  name: string;
  content: string;
  proxied: boolean;
  ttl: number;
}

export interface CloudflareSslConfig {
  mode: "off" | "flexible" | "full" | "strict";
  minTlsVersion: string;
  alwaysUseHttps: boolean;
}

export interface CloudflareWafRule {
  id: string;
  name: string;
  expression: string;
  action: "block" | "challenge" | "log" | "allow";
  enabled: boolean;
}

export interface CloudflareConfig {
  zoneName: string;
  dnsRecords: CloudflareDnsRecord[];
  ssl: CloudflareSslConfig;
  wafRules: CloudflareWafRule[];
  prepared: boolean;
}

export interface SupabaseEnvironment {
  id: CloudEnvironment;
  projectRef: string;
  region: string;
  url: string;
  anonKeyPlaceholder: string;
  serviceRolePlaceholder: string;
  migrationsApplied: number;
  rlsEnabled: boolean;
}

export interface SupabaseEnvironmentStrategy {
  environments: SupabaseEnvironment[];
  activeEnvironment: CloudEnvironment;
  persistenceProvider: string;
  configured: boolean;
}

export interface EnvVarGroup {
  environment: CloudEnvironment;
  prefix: string;
  variables: EnvVarEntry[];
}

export interface EnvVarEntry {
  key: string;
  required: boolean;
  category: string;
  description: string;
  placeholder?: string;
}

export interface SecretRegistryEntry {
  id: string;
  key: string;
  provider: CloudProvider | "forgeos";
  environment: CloudEnvironment | "all";
  required: boolean;
  present: boolean;
  category: string;
  description: string;
}

export interface DeploymentProviderStatus {
  provider: CloudProvider;
  status: CloudHealthStatus;
  message: string;
  lastCheckedAt: string;
}

export interface DeploymentSnapshot {
  pipelineId?: string;
  mode: "dry_run" | "preview" | "real";
  status: DeploymentStatus;
  previewUrl?: string;
  repoUrl?: string;
  stagesCompleted: number;
  stagesTotal: number;
  providers: DeploymentProviderStatus[];
  rollbackReady: boolean;
  productionBlocked: boolean;
}

export interface ReleaseHistoryEntry {
  id: string;
  version: string;
  environment: CloudEnvironment;
  branch: string;
  deployedAt: string;
  deployedBy: string;
  status: DeploymentStatus;
  notes?: string;
  commitSha?: string;
}

export interface RollbackPreparedPlan {
  id: string;
  releaseId: string;
  ready: boolean;
  steps: string[];
  estimatedMinutes: number;
  wiredToBuildPipeline: boolean;
  summary: string;
}

export interface CloudHealthCheck {
  id: string;
  label: string;
  provider: CloudProvider | "system";
  status: CloudHealthStatus;
  message?: string;
  publicApiOnly: boolean;
}

export interface CloudHealthSnapshot {
  overallStatus: CloudHealthStatus;
  checks: CloudHealthCheck[];
  productionReadinessScore: number;
  timestamp: string;
}

export interface CloudFoundationConfig {
  version: string;
  dryRun: boolean;
  previewOnly: boolean;
  productionBlocked: boolean;
  activeEnvironment: CloudEnvironment;
  providers: CloudProvider[];
}

export interface CloudDashboardSnapshot {
  version: string;
  generatedAt: string;
  config: CloudFoundationConfig;
  github: GitHubStrategy;
  vercel: VercelConfig;
  cloudflare: CloudflareConfig;
  supabase: SupabaseEnvironmentStrategy;
  envGroups: EnvVarGroup[];
  secrets: SecretRegistryEntry[];
  deployment: DeploymentSnapshot;
  releases: ReleaseHistoryEntry[];
  rollback: RollbackPreparedPlan;
  health: CloudHealthSnapshot;
}

/** PROGRAM 5380 — Preview deployment plan types */
export interface RepositoryPlan {
  fullName: string;
  private: boolean;
  filesIncluded: number;
  dryRun: boolean;
  created?: boolean;
  repoUrl?: string;
}

export interface SupabasePreviewPlan {
  projectName: string;
  schemaTables: string[];
  dryRun: boolean;
  configured?: boolean;
  projectUrl?: string;
}

export interface VercelPreviewPlan {
  projectName: string;
  dryRun: boolean;
  deployed?: boolean;
  previewUrl?: string;
  deploymentId?: string;
}
