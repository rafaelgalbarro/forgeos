/** Program 4300 — Supabase environment strategy */

import {
  getPersistenceProvider,
  isSupabaseConfigured,
  resolveActiveProvider,
} from "@/lib/persistence/config";
import type { CloudEnvironment, SupabaseEnvironmentStrategy } from "./types";

function readEnv(key: string): string | undefined {
  if (typeof process !== "undefined" && process.env?.[key]) {
    return process.env[key];
  }
  return undefined;
}

function buildSupabaseEnv(
  id: CloudEnvironment,
  projectRef: string,
  region: string
) {
  return {
    id,
    projectRef,
    region,
    url: `https://${projectRef}.supabase.co`,
    anonKeyPlaceholder: `SUPABASE_${id.toUpperCase()}_ANON_KEY`,
    serviceRolePlaceholder: `SUPABASE_${id.toUpperCase()}_SERVICE_ROLE_KEY`,
    migrationsApplied: id === "development" ? 0 : id === "preview" ? 3 : id === "staging" ? 8 : 12,
    rlsEnabled: id !== "development",
  };
}

export function getSupabaseEnvironmentStrategy(): SupabaseEnvironmentStrategy {
  const configured = isSupabaseConfigured();
  const provider = resolveActiveProvider();
  const activeEnv = (readEnv("CLOUD_ACTIVE_ENVIRONMENT") ?? "preview") as CloudEnvironment;

  return {
    environments: [
      buildSupabaseEnv("development", "forgeos-dev", "eu-west-1"),
      buildSupabaseEnv("preview", "forgeos-preview", "eu-west-1"),
      buildSupabaseEnv("staging", "forgeos-staging", "eu-west-1"),
      buildSupabaseEnv("production", "forgeos-prod", "eu-west-1"),
    ],
    activeEnvironment: activeEnv,
    persistenceProvider: provider,
    configured,
  };
}

export function getSupabasePersistenceNote(): string {
  const strategy = getSupabaseEnvironmentStrategy();
  const configured = getPersistenceProvider();
  if (!strategy.configured) {
    return `Proveedor ${configured} — Supabase no configurado (preparación)`;
  }
  return `Supabase activo — entorno ${strategy.activeEnvironment}`;
}
