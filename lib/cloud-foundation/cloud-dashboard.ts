/** Program 4300 — Cloud Foundation dashboard aggregator */

import { buildCloudFoundationConfig } from "./config";
import { getGitHubStrategy } from "./github-strategy";
import { getVercelConfig } from "./vercel-config";
import { getCloudflareConfig } from "./cloudflare-config";
import { getSupabaseEnvironmentStrategy } from "./supabase-environments";
import { getEnvVarGroups } from "./env-separation";
import { getSecretsRegistry } from "./secrets-management";
import { buildDeploymentSnapshot } from "./deployment-status";
import { getReleaseHistory, seedReleaseHistory } from "./release-history";
import { getRollbackPreparedPlan } from "./rollback-prepared";
import { buildCloudHealthSnapshot } from "./health-checks";
import { CLOUD_FOUNDATION_VERSION } from "./types";
import type { CloudDashboardSnapshot } from "./types";

export async function buildCloudDashboardSnapshot(): Promise<CloudDashboardSnapshot> {
  if (typeof window !== "undefined") {
    seedReleaseHistory();
  }

  const [deployment, rollback, health] = await Promise.all([
    buildDeploymentSnapshot(),
    getRollbackPreparedPlan(),
    buildCloudHealthSnapshot(),
  ]);

  return {
    version: CLOUD_FOUNDATION_VERSION,
    generatedAt: new Date().toISOString(),
    config: buildCloudFoundationConfig(),
    github: getGitHubStrategy(),
    vercel: getVercelConfig(),
    cloudflare: getCloudflareConfig(),
    supabase: getSupabaseEnvironmentStrategy(),
    envGroups: getEnvVarGroups(),
    secrets: getSecretsRegistry(),
    deployment,
    releases: getReleaseHistory(),
    rollback,
    health,
  };
}

export async function runCloudFoundationEngine(): Promise<CloudDashboardSnapshot> {
  return buildCloudDashboardSnapshot();
}
