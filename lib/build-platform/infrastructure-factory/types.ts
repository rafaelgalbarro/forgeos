import type { BuildContext } from "@/lib/build-platform/build-context/types";

export type InfraPlanStatus = "draft" | "ready";
export type InfraEnvironment = "development" | "staging" | "production";

export interface InfraFactoryInput {
  context: BuildContext;
  dna: InfraBuildDna;
  registry: InfraBuildRegistry;
}

export interface InfraBlueprintMeta {
  ventureId: string;
  ventureName: string;
  generatedAt: string;
  version: string;
  status: InfraPlanStatus;
  primaryDeployment: string;
  cicdProvider: string;
  databaseProvider: string;
}

export interface DockerServiceSpec {
  id: string;
  name: string;
  image: string;
  ports: string[];
  envKeys: string[];
  dependsOn: string[];
}

export interface DockerSpec {
  id: string;
  baseImage: string;
  composeVersion: string;
  services: DockerServiceSpec[];
  volumes: string[];
  networks: string[];
  buildStages: string[];
  healthChecks: string[];
}

export interface CiCdJobSpec {
  id: string;
  name: string;
  trigger: "push" | "pull_request" | "workflow_dispatch" | "schedule";
  steps: string[];
  secrets: string[];
}

export interface CiCdSpec {
  id: string;
  provider: "github-actions";
  workflowFile: string;
  nodeVersion: string;
  jobs: CiCdJobSpec[];
  environments: InfraEnvironment[];
  artifactOutputs: string[];
}

export interface VercelProjectSpec {
  framework: string;
  buildCommand: string;
  outputDirectory: string;
  installCommand: string;
  regions: string[];
}

export interface VercelSpec {
  id: string;
  projectName: string;
  adapter: "vercel";
  project: VercelProjectSpec;
  envKeys: string[];
  domains: string[];
  previewDeployments: boolean;
  serverlessFunctions: string[];
}

export interface CloudflareWorkerRouteSpec {
  pattern: string;
  script: string;
}

export interface CloudflareSpec {
  id: string;
  adapter: "cloudflare";
  workers: CloudflareWorkerRouteSpec[];
  pagesProject: string;
  dnsRecords: string[];
  envKeys: string[];
  cacheRules: string[];
  wafRules: string[];
}

export interface SupabaseTableSpec {
  name: string;
  rlsEnabled: boolean;
  policies: string[];
}

export interface SupabaseSpec {
  id: string;
  adapter: "supabase";
  projectRef: string;
  region: string;
  authProviders: string[];
  tables: SupabaseTableSpec[];
  storageBuckets: string[];
  edgeFunctions: string[];
  envKeys: string[];
  connectionPlaceholder: string;
}

export interface RailwayServiceSpec {
  id: string;
  name: string;
  source: string;
  healthcheckPath: string;
  envKeys: string[];
}

export interface RailwaySpec {
  id: string;
  adapter: "railway";
  projectName: string;
  services: RailwayServiceSpec[];
  volumes: string[];
  envKeys: string[];
}

export interface AwsResourceSpec {
  id: string;
  service: string;
  name: string;
  purpose: string;
  configKeys: string[];
}

export interface AwsSpec {
  id: string;
  adapter: "aws";
  region: string;
  resources: AwsResourceSpec[];
  iamRoles: string[];
  envKeys: string[];
  secretsManagerKeys: string[];
}

export interface AzureResourceSpec {
  id: string;
  service: string;
  name: string;
  purpose: string;
  configKeys: string[];
}

export interface AzureSpec {
  id: string;
  adapter: "azure";
  region: string;
  resourceGroup: string;
  resources: AzureResourceSpec[];
  managedIdentities: string[];
  envKeys: string[];
  keyVaultKeys: string[];
}

export interface GcpResourceSpec {
  id: string;
  service: string;
  name: string;
  purpose: string;
  configKeys: string[];
}

export interface GcpSpec {
  id: string;
  adapter: "gcp";
  region: string;
  projectId: string;
  resources: GcpResourceSpec[];
  serviceAccounts: string[];
  envKeys: string[];
  secretManagerKeys: string[];
}

export interface InfraBlueprintValidationIssue {
  code: string;
  message: string;
  severity: "warning" | "error";
}

export interface InfraBlueprintValidation {
  valid: boolean;
  issues: InfraBlueprintValidationIssue[];
}

export interface InfraBlueprint {
  meta: InfraBlueprintMeta;
  docker: DockerSpec;
  cicd: CiCdSpec;
  vercel: VercelSpec;
  cloudflare: CloudflareSpec;
  supabase: SupabaseSpec;
  railway: RailwaySpec;
  aws: AwsSpec;
  azure: AzureSpec;
  gcp: GcpSpec;
  validation: InfraBlueprintValidation;
}

export interface InfraBuildDna {
  deployment: string;
  cicd: string;
  database: string;
  auth: string;
  monitoring: string;
  environments: InfraEnvironment[];
  rollbackStrategy: string;
  deploymentRules: string[];
  complexity: "low" | "medium" | "high";
}

export interface InfraRegistryEntry {
  id: string;
  name: string;
  category: "provider" | "technology" | "worker" | "generator";
  tags: string[];
}

export interface InfraBuildRegistry {
  entries: InfraRegistryEntry[];
  deploymentProviders: string[];
  cicdProviders: string[];
  databaseProviders: string[];
}
