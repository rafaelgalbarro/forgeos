/** Program 4300 — Cloud Foundation public API */

export { CLOUD_FOUNDATION_VERSION } from "./types";
export type * from "./types";

export {
  CLOUD_STORAGE_KEYS,
  isCloudDryRun,
  isCloudPreviewOnly,
  isCloudProductionBlocked,
  getCloudActiveEnvironment,
  getCloudProviders,
  getVercelProjectName,
  getCloudflareZoneName,
  getGitHubOrg,
  getGitHubRepo,
  buildCloudFoundationConfig,
} from "./config";

export { getGitHubStrategy, getBranchDeployTarget } from "./github-strategy";
export { getVercelConfig, getVercelEnvForBranch } from "./vercel-config";
export { getCloudflareConfig, getCloudflareReadinessSummary } from "./cloudflare-config";
export { getSupabaseEnvironmentStrategy, getSupabasePersistenceNote } from "./supabase-environments";
export { getEnvVarGroups, getEnvVarCountForEnvironment, getRequiredEnvVars } from "./env-separation";
export { getSecretsRegistry, getSecretsSummary, getSecretsForEnvironment } from "./secrets-management";
export { buildDeploymentSnapshot } from "./deployment-status";
export { getReleaseHistory, registerRelease, getLatestRelease, seedReleaseHistory } from "./release-history";
export { getRollbackPreparedPlan, getRollbackReadinessLabel } from "./rollback-prepared";
export { buildCloudHealthSnapshot } from "./health-checks";
export { buildCloudDashboardSnapshot, runCloudFoundationEngine } from "./cloud-dashboard";
export {
  planOrCreateRepository,
  planOrConfigureSupabase,
  planOrDeployVercel,
} from "./preview-adapters";
export type {
  GitHubPreviewResult,
  SupabasePreviewResult,
  VercelPreviewResult,
} from "./preview-adapters";
