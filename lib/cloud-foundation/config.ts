/** Program 4300 — Cloud Foundation configuration */

import type { CloudEnvironment, CloudFoundationConfig, CloudProvider } from "./types";

export const CLOUD_FOUNDATION_VERSION = "Program 4300 — Cloud Foundation";

export const CLOUD_STORAGE_KEYS = {
  releaseHistory: "forgeos-cloud-release-history",
  deploymentStatus: "forgeos-cloud-deployment-status",
} as const;

function readEnv(key: string): string | undefined {
  if (typeof process !== "undefined" && process.env?.[key]) {
    return process.env[key];
  }
  return undefined;
}

export function isCloudDryRun(): boolean {
  const raw = readEnv("CLOUD_DRY_RUN") ?? readEnv("PRODUCTION_DRY_RUN");
  return raw !== "false";
}

export function isCloudPreviewOnly(): boolean {
  return readEnv("CLOUD_PREVIEW_ONLY") !== "false";
}

export function isCloudProductionBlocked(): boolean {
  return readEnv("CLOUD_PRODUCTION_BLOCKED") !== "false";
}

export function getCloudActiveEnvironment(): CloudEnvironment {
  const raw =
    readEnv("CLOUD_ACTIVE_ENVIRONMENT") ??
    readEnv("REAL_EXECUTION_DEFAULT_ENVIRONMENT") ??
    "preview";

  if (raw === "development" || raw === "preview" || raw === "staging" || raw === "production") {
    return raw;
  }
  return "preview";
}

export function getCloudProviders(): CloudProvider[] {
  const raw = readEnv("CLOUD_PROVIDERS");
  if (raw) {
    return raw.split(",").map((p) => p.trim()) as CloudProvider[];
  }
  return ["github", "vercel", "cloudflare", "supabase"];
}

export function getVercelProjectName(): string {
  return readEnv("VERCEL_PROJECT_NAME") ?? "forgeos-app-factory";
}

export function getCloudflareZoneName(): string {
  return readEnv("CLOUDFLARE_ZONE_NAME") ?? "forgeos.app";
}

export function getGitHubOrg(): string {
  return readEnv("GITHUB_ORG") ?? "forgeos";
}

export function getGitHubRepo(): string {
  return readEnv("GITHUB_REPO") ?? "forgeos-app-factory";
}

export function buildCloudFoundationConfig(): CloudFoundationConfig {
  return {
    version: CLOUD_FOUNDATION_VERSION,
    dryRun: isCloudDryRun(),
    previewOnly: isCloudPreviewOnly(),
    productionBlocked: isCloudProductionBlocked(),
    activeEnvironment: getCloudActiveEnvironment(),
    providers: getCloudProviders(),
  };
}
