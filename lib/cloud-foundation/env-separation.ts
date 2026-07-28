/** Program 4300 — Environment variable separation */

import type { CloudEnvironment, EnvVarGroup } from "./types";

const BASE_VARS: Array<{
  key: string;
  required: boolean;
  category: string;
  description: string;
  placeholder?: string;
}> = [
  { key: "NEXT_PUBLIC_AI_PROVIDER", required: false, category: "ai", description: "Proveedor IA visible en UI" },
  { key: "ENABLE_REAL_EXECUTION", required: false, category: "execution", description: "Ejecución real habilitada" },
  { key: "ENABLE_REAL_BUILD_FLOW", required: false, category: "build", description: "Build flow real habilitado" },
  { key: "PERSISTENCE_PROVIDER", required: true, category: "persistence", description: "Proveedor de persistencia" },
  { key: "ENABLE_PRODUCTION_MONITORING", required: false, category: "monitoring", description: "Monitoreo de producción" },
];

const PROVIDER_VARS: Record<CloudEnvironment, Array<{
  key: string;
  required: boolean;
  category: string;
  description: string;
  placeholder?: string;
}>> = {
  development: [
    { key: "GITHUB_TOKEN", required: false, category: "github", description: "Token GitHub (dev)", placeholder: "ghp_..." },
    { key: "SUPABASE_URL", required: false, category: "supabase", description: "URL Supabase dev" },
    { key: "SUPABASE_ANON_KEY", required: false, category: "supabase", description: "Anon key Supabase dev" },
    { key: "VERCEL_TOKEN", required: false, category: "vercel", description: "Token Vercel dev" },
    { key: "CLOUDFLARE_API_TOKEN", required: false, category: "cloudflare", description: "Token Cloudflare dev" },
  ],
  preview: [
    { key: "GITHUB_TOKEN", required: false, category: "github", description: "Token GitHub (preview)" },
    { key: "NEXT_PUBLIC_SUPABASE_URL", required: false, category: "supabase", description: "URL Supabase preview" },
    { key: "NEXT_PUBLIC_SUPABASE_ANON_KEY", required: false, category: "supabase", description: "Anon key preview" },
    { key: "VERCEL_TOKEN", required: false, category: "vercel", description: "Token Vercel preview" },
    { key: "CLOUDFLARE_API_TOKEN", required: false, category: "cloudflare", description: "Token Cloudflare preview" },
  ],
  staging: [
    { key: "GITHUB_TOKEN", required: true, category: "github", description: "Token GitHub (staging)" },
    { key: "SUPABASE_STAGING_URL", required: true, category: "supabase", description: "URL Supabase staging", placeholder: "https://xxx.supabase.co" },
    { key: "SUPABASE_STAGING_ANON_KEY", required: true, category: "supabase", description: "Anon key staging" },
    { key: "VERCEL_TOKEN", required: true, category: "vercel", description: "Token Vercel staging" },
    { key: "CLOUDFLARE_API_TOKEN", required: false, category: "cloudflare", description: "Token Cloudflare staging" },
  ],
  production: [
    { key: "GITHUB_TOKEN", required: true, category: "github", description: "Token GitHub (prod)" },
    { key: "SUPABASE_PROD_URL", required: true, category: "supabase", description: "URL Supabase producción" },
    { key: "SUPABASE_PROD_ANON_KEY", required: true, category: "supabase", description: "Anon key producción" },
    { key: "VERCEL_TOKEN", required: true, category: "vercel", description: "Token Vercel producción" },
    { key: "CLOUDFLARE_API_TOKEN", required: true, category: "cloudflare", description: "Token Cloudflare producción" },
    { key: "STRIPE_SECRET_KEY", required: false, category: "commercial", description: "Stripe secret key" },
  ],
};

const PREFIX_MAP: Record<CloudEnvironment, string> = {
  development: "DEV_",
  preview: "PREVIEW_",
  staging: "STAGING_",
  production: "PROD_",
};

export function getEnvVarGroups(): EnvVarGroup[] {
  const environments: CloudEnvironment[] = ["development", "preview", "staging", "production"];

  return environments.map((env) => ({
    environment: env,
    prefix: PREFIX_MAP[env],
    variables: [...BASE_VARS, ...PROVIDER_VARS[env]],
  }));
}

export function getEnvVarCountForEnvironment(env: CloudEnvironment): number {
  const group = getEnvVarGroups().find((g) => g.environment === env);
  return group?.variables.length ?? 0;
}

export function getRequiredEnvVars(env: CloudEnvironment): string[] {
  const group = getEnvVarGroups().find((g) => g.environment === env);
  return group?.variables.filter((v) => v.required).map((v) => v.key) ?? [];
}
