/** Program 4300 — Secrets registry stub (no real secrets in repo) */

import type { CloudEnvironment, SecretRegistryEntry } from "./types";

function readEnv(key: string): boolean {
  if (typeof process !== "undefined" && process.env?.[key]) {
    return Boolean(process.env[key]);
  }
  return false;
}

const SECRET_DEFINITIONS: Array<Omit<SecretRegistryEntry, "present">> = [
  { id: "github-token", key: "GITHUB_TOKEN", provider: "github", environment: "all", required: false, category: "vcs", description: "Personal access token GitHub" },
  { id: "vercel-token", key: "VERCEL_TOKEN", provider: "vercel", environment: "all", required: false, category: "deploy", description: "Token API Vercel" },
  { id: "cloudflare-token", key: "CLOUDFLARE_API_TOKEN", provider: "cloudflare", environment: "all", required: false, category: "dns", description: "Token API Cloudflare" },
  { id: "supabase-access", key: "SUPABASE_ACCESS_TOKEN", provider: "supabase", environment: "all", required: false, category: "database", description: "Token acceso Supabase Management API" },
  { id: "supabase-url-dev", key: "SUPABASE_URL", provider: "supabase", environment: "development", required: false, category: "database", description: "URL proyecto Supabase dev" },
  { id: "supabase-anon-dev", key: "SUPABASE_ANON_KEY", provider: "supabase", environment: "development", required: false, category: "database", description: "Anon key Supabase dev" },
  { id: "supabase-url-staging", key: "SUPABASE_STAGING_URL", provider: "supabase", environment: "staging", required: true, category: "database", description: "URL proyecto Supabase staging" },
  { id: "supabase-url-prod", key: "SUPABASE_PROD_URL", provider: "supabase", environment: "production", required: true, category: "database", description: "URL proyecto Supabase producción" },
  { id: "stripe-secret", key: "STRIPE_SECRET_KEY", provider: "forgeos", environment: "production", required: false, category: "commercial", description: "Stripe secret key" },
  { id: "auth-secret", key: "AUTH_SECRET", provider: "forgeos", environment: "all", required: false, category: "auth", description: "Auth.js secret" },
];

export function getSecretsRegistry(): SecretRegistryEntry[] {
  return SECRET_DEFINITIONS.map((def) => ({
    ...def,
    present: readEnv(def.key),
  }));
}

export function getSecretsSummary(): { total: number; present: number; missing: number; requiredMissing: number } {
  const registry = getSecretsRegistry();
  const present = registry.filter((s) => s.present).length;
  const requiredMissing = registry.filter((s) => s.required && !s.present).length;
  return {
    total: registry.length,
    present,
    missing: registry.length - present,
    requiredMissing,
  };
}

export function getSecretsForEnvironment(env: CloudEnvironment): SecretRegistryEntry[] {
  return getSecretsRegistry().filter((s) => s.environment === "all" || s.environment === env);
}
