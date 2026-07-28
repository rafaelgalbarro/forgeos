/** ForgeOS RC5.3 — provider health checks. */

import { checkProviderHealth } from "@/lib/connections/security/connection-health";
import type { ConnectionProvider } from "@/lib/connections/shared/types";
import { isProviderRealExecutionEnabled } from "@/lib/real-build-flow/execution-flags";

export interface ProviderHealthSnapshot {
  provider: ConnectionProvider;
  healthy: boolean;
  configured: boolean;
  realEnabled: boolean;
  message: string;
}

export async function checkAllProviderHealthRc53(): Promise<ProviderHealthSnapshot[]> {
  const providers: ConnectionProvider[] = ["github", "vercel", "supabase", "cloudflare"];
  const results: ProviderHealthSnapshot[] = [];

  for (const provider of providers) {
    const health = await checkProviderHealth(provider);
    results.push({
      provider,
      healthy: health.healthy,
      configured: health.configured,
      realEnabled: isProviderRealExecutionEnabled(provider),
      message: health.message,
    });
  }

  return results;
}

export async function isProviderReadyForReal(
  provider: ConnectionProvider
): Promise<{ ready: boolean; reason: string }> {
  if (!isProviderRealExecutionEnabled(provider)) {
    return { ready: false, reason: `ENABLE_REAL_${provider.toUpperCase()}_EXECUTION=false` };
  }
  const health = await checkProviderHealth(provider);
  if (!health.configured) {
    return { ready: false, reason: `${provider} token not configured` };
  }
  if (!health.healthy && health.configured) {
    return { ready: false, reason: health.message };
  }
  return { ready: true, reason: "Provider ready for controlled real execution" };
}
