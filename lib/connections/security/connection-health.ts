/** ForgeOS Real Connections — provider health checks (RC5). */

import { hasCredential } from "./credential-store";
import type { ConnectionHealthStatus, ConnectionProvider } from "../shared/types";

const HEALTH_CACHE = new Map<ConnectionProvider, ConnectionHealthStatus>();

export async function checkProviderHealth(
  provider: ConnectionProvider
): Promise<ConnectionHealthStatus> {
  const started = Date.now();
  const configured = hasCredential(provider);

  if (!configured) {
    const status: ConnectionHealthStatus = {
      provider,
      healthy: false,
      configured: false,
      message: "Credential not configured in server environment",
      lastCheckedAt: new Date().toISOString(),
      latencyMs: Date.now() - started,
    };
    HEALTH_CACHE.set(provider, status);
    return status;
  }

  const status: ConnectionHealthStatus = {
    provider,
    healthy: true,
    configured: true,
    message: "Credential present — use /api/connections/test for live validation",
    lastCheckedAt: new Date().toISOString(),
    latencyMs: Date.now() - started,
  };
  HEALTH_CACHE.set(provider, status);
  return status;
}

export async function checkAllProviderHealth(): Promise<ConnectionHealthStatus[]> {
  const providers: ConnectionProvider[] = ["github", "supabase", "vercel", "cloudflare"];
  return Promise.all(providers.map(checkProviderHealth));
}

export function getCachedHealth(provider: ConnectionProvider): ConnectionHealthStatus | undefined {
  return HEALTH_CACHE.get(provider);
}
