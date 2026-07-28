/** Program 3000 Sprint 3 — Persistence provider configuration. */

import type { PersistenceProvider } from "./types";

const VALID_PROVIDERS: PersistenceProvider[] = ["local", "supabase", "postgres"];

function readEnv(key: string): string | undefined {
  if (typeof process !== "undefined" && process.env?.[key]) {
    return process.env[key];
  }
  return undefined;
}

export function getPersistenceProvider(): PersistenceProvider {
  const raw =
    readEnv("NEXT_PUBLIC_PERSISTENCE_PROVIDER") ??
    readEnv("PERSISTENCE_PROVIDER") ??
    "local";

  if (VALID_PROVIDERS.includes(raw as PersistenceProvider)) {
    return raw as PersistenceProvider;
  }
  return "local";
}

export function isSupabaseConfigured(): boolean {
  const url = readEnv("NEXT_PUBLIC_SUPABASE_URL") ?? readEnv("SUPABASE_URL");
  const key =
    readEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY") ?? readEnv("SUPABASE_ANON_KEY");
  return Boolean(url && key);
}

export function isPostgresConfigured(): boolean {
  return Boolean(readEnv("DATABASE_URL"));
}

export function getSupabaseConfig(): { url: string; anonKey: string } | null {
  const url = readEnv("NEXT_PUBLIC_SUPABASE_URL") ?? readEnv("SUPABASE_URL");
  const anonKey =
    readEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY") ?? readEnv("SUPABASE_ANON_KEY");
  if (!url || !anonKey) return null;
  return { url, anonKey };
}

export function getDatabaseUrl(): string | null {
  return readEnv("DATABASE_URL") ?? null;
}

export function resolveActiveProvider(): PersistenceProvider {
  const configured = getPersistenceProvider();
  if (configured === "supabase" && isSupabaseConfigured()) return "supabase";
  if (configured === "postgres" && isPostgresConfigured()) return "postgres";
  return "local";
}

export const PERSISTENCE_CONFIG = {
  autosaveDebounceMs: 800,
  syncIntervalMs: 30_000,
  maxVersions: 20,
  maxSnapshots: 10,
  storagePrefix: "forgeos-persist",
} as const;
