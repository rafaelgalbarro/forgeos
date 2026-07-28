/** ForgeOS Real Connections — RC5 secure external tool integration. */

export * from "./shared";
export * from "./security";
export { githubAdapter } from "./github/adapter";
export { supabaseAdapter } from "./supabase/adapter";
export { vercelAdapter } from "./vercel/adapter";
export { cloudflareAdapter } from "./cloudflare/adapter";
export {
  executeCapabilityConnection,
  isRealConnectionCapability,
  resolveConnectionProvider,
  getConnectionAdapter,
  formatConnectionOutput,
  listConnectedCapabilities,
} from "./adapters/capability-connection-adapter";

import { checkAllProviderHealth } from "./security/connection-health";
import { listAuthConfigs } from "./security/credential-store";
import { getConnectionAuditLog } from "./security/connection-audit";
import { listConnectedCapabilities } from "./adapters/capability-connection-adapter";
import type { ConnectionProvider } from "./shared/types";
import { githubAdapter } from "./github/adapter";
import { supabaseAdapter } from "./supabase/adapter";
import { vercelAdapter } from "./vercel/adapter";
import { cloudflareAdapter } from "./cloudflare/adapter";

export async function testConnection(provider: ConnectionProvider, ventureId: string, requestedBy: string) {
  const adapters = { github: githubAdapter, supabase: supabaseAdapter, vercel: vercelAdapter, cloudflare: cloudflareAdapter };
  return adapters[provider].run("validate", { ventureId, requestedBy, mode: "dry_run" });
}

export async function generateDryRunPlan(
  provider: ConnectionProvider,
  operation: string,
  ventureId: string,
  requestedBy: string,
  payload?: Record<string, unknown>
) {
  const adapters = { github: githubAdapter, supabase: supabaseAdapter, vercel: vercelAdapter, cloudflare: cloudflareAdapter };
  return adapters[provider].run(operation, { ventureId, requestedBy, mode: "dry_run", payload });
}

export function getConnectionsOverview(ventureId?: string) {
  return {
    auth: listAuthConfigs().map((a) => ({ provider: a.provider, configured: a.configured })),
    capabilities: listConnectedCapabilities(),
    audit: getConnectionAuditLog(ventureId),
  };
}

export async function getConnectionsHealth() {
  return checkAllProviderHealth();
}
