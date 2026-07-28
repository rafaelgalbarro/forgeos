/** PROGRAM 5380 — Preview deployment feature flags. */

import type { PreviewDeploymentPolicy } from "./types";

function readEnv(key: string): string | undefined {
  if (typeof process !== "undefined" && process.env?.[key]) {
    return process.env[key];
  }
  return undefined;
}

function readBool(key: string, defaultValue = false): boolean {
  const raw = readEnv(key);
  if (raw === undefined) return defaultValue;
  return raw === "true" || raw === "1";
}

export function getPreviewDeploymentPolicy(): PreviewDeploymentPolicy {
  const environment = (readEnv("PREVIEW_DEPLOYMENT_ENVIRONMENT") ?? "preview") as PreviewDeploymentPolicy["environment"];
  return {
    enablePreviewDeployment: readBool("ENABLE_PREVIEW_DEPLOYMENT", false),
    enableGithubPush: readBool("ENABLE_PREVIEW_GITHUB_PUSH", false),
    enableVercelDeployment: readBool("ENABLE_PREVIEW_VERCEL_DEPLOYMENT", false),
    enableSupabaseSetup: readBool("ENABLE_PREVIEW_SUPABASE_SETUP", false),
    requireApproval: readBool("PREVIEW_DEPLOYMENT_REQUIRE_APPROVAL", true),
    environment: environment === "sandbox" || environment === "dry_run" ? environment : "preview",
    allowProduction: readBool("PREVIEW_DEPLOYMENT_ALLOW_PRODUCTION", false),
  };
}

export function isPreviewDeploymentEnabled(): boolean {
  return getPreviewDeploymentPolicy().enablePreviewDeployment;
}

export function isRealPreviewDeploymentAvailable(): boolean {
  const policy = getPreviewDeploymentPolicy();
  return (
    policy.enablePreviewDeployment &&
    (policy.enableGithubPush || policy.enableVercelDeployment || policy.enableSupabaseSetup)
  );
}

export function getPreviewDeploymentFlagsSnapshot(): PreviewDeploymentPolicy & {
  modeLabel: string;
  dryRunDefault: boolean;
} {
  const policy = getPreviewDeploymentPolicy();
  const realAvailable = isRealPreviewDeploymentAvailable();
  return {
    ...policy,
    modeLabel: realAvailable ? "preview (real when creds + flags)" : "dry-run / plan only",
    dryRunDefault: !realAvailable,
  };
}
