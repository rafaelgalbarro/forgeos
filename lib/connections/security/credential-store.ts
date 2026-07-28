/** ForgeOS Real Connections — server-side credential store (RC5). */

import type { ConnectionAuthConfig, ConnectionProvider } from "../shared/types";

const PROVIDER_ENV_KEYS: Record<ConnectionProvider, string> = {
  github: "GITHUB_TOKEN",
  supabase: "SUPABASE_ACCESS_TOKEN",
  vercel: "VERCEL_TOKEN",
  cloudflare: "CLOUDFLARE_API_TOKEN",
};

export function getProviderEnvKey(provider: ConnectionProvider): string {
  return PROVIDER_ENV_KEYS[provider];
}

export function getCredential(provider: ConnectionProvider): string | undefined {
  if (typeof process === "undefined" || !process.env) return undefined;
  const key = PROVIDER_ENV_KEYS[provider];
  const value = process.env[key];
  return value?.trim() || undefined;
}

export function hasCredential(provider: ConnectionProvider): boolean {
  return Boolean(getCredential(provider));
}

export function getAuthConfig(provider: ConnectionProvider): ConnectionAuthConfig {
  const envKey = PROVIDER_ENV_KEYS[provider];
  return {
    provider,
    envKey,
    configured: hasCredential(provider),
  };
}

export function listAuthConfigs(): ConnectionAuthConfig[] {
  const providers: ConnectionProvider[] = ["github", "supabase", "vercel", "cloudflare"];
  return providers.map(getAuthConfig);
}

/** Throws if credential missing — server-side only */
export function requireCredential(provider: ConnectionProvider): string {
  const token = getCredential(provider);
  if (!token) {
    throw new Error(`Missing ${PROVIDER_ENV_KEYS[provider]} — configure in server environment`);
  }
  return token;
}
