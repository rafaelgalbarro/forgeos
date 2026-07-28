/** ForgeOS RC5.3 — per-provider execution flags. */

import type { ConnectionProvider } from "@/lib/connections/shared/types";

export type ExecutionModeLabel =
  | "DRY_RUN"
  | "REAL_EXECUTION_DISABLED"
  | "REAL_EXECUTION_ENABLED";

export interface ExecutionFlagsSnapshot {
  enableRealExecution: boolean;
  enableRealBuildFlow: boolean;
  enableRealGithub: boolean;
  enableRealVercel: boolean;
  enableRealSupabase: boolean;
  enableRealCloudflare: boolean;
  requireApproval: boolean;
  defaultEnvironment: string;
  allowDestructive: boolean;
  modeLabel: ExecutionModeLabel;
}

function envTrue(key: string): boolean {
  return process.env[key] === "true";
}

export function isProviderRealExecutionEnabled(provider: ConnectionProvider): boolean {
  if (!envTrue("ENABLE_REAL_EXECUTION")) return false;
  switch (provider) {
    case "github":
      return envTrue("ENABLE_REAL_GITHUB_EXECUTION");
    case "vercel":
      return envTrue("ENABLE_REAL_VERCEL_EXECUTION");
    case "supabase":
      return envTrue("ENABLE_REAL_SUPABASE_EXECUTION");
    case "cloudflare":
      return envTrue("ENABLE_REAL_CLOUDFLARE_EXECUTION");
    default:
      return false;
  }
}

export function getExecutionFlagsSnapshot(): ExecutionFlagsSnapshot {
  const enableRealExecution = envTrue("ENABLE_REAL_EXECUTION");
  const anyProvider =
    envTrue("ENABLE_REAL_GITHUB_EXECUTION") ||
    envTrue("ENABLE_REAL_VERCEL_EXECUTION") ||
    envTrue("ENABLE_REAL_SUPABASE_EXECUTION") ||
    envTrue("ENABLE_REAL_CLOUDFLARE_EXECUTION");

  let modeLabel: ExecutionModeLabel = "DRY_RUN";
  if (enableRealExecution && anyProvider) {
    modeLabel = "REAL_EXECUTION_ENABLED";
  } else if (enableRealExecution) {
    modeLabel = "REAL_EXECUTION_DISABLED";
  }

  return {
    enableRealExecution,
    enableRealBuildFlow: envTrue("ENABLE_REAL_BUILD_FLOW"),
    enableRealGithub: envTrue("ENABLE_REAL_GITHUB_EXECUTION"),
    enableRealVercel: envTrue("ENABLE_REAL_VERCEL_EXECUTION"),
    enableRealSupabase: envTrue("ENABLE_REAL_SUPABASE_EXECUTION"),
    enableRealCloudflare: envTrue("ENABLE_REAL_CLOUDFLARE_EXECUTION"),
    requireApproval: process.env.REAL_EXECUTION_REQUIRE_APPROVAL !== "false",
    defaultEnvironment: process.env.REAL_EXECUTION_DEFAULT_ENVIRONMENT ?? "preview",
    allowDestructive: envTrue("REAL_EXECUTION_ALLOW_DESTRUCTIVE"),
    modeLabel,
  };
}

export function canExecuteProviderReal(provider: ConnectionProvider): boolean {
  return isProviderRealExecutionEnabled(provider);
}
