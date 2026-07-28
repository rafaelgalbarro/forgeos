/** Program 3000 — Auth configuration (provider-agnostic). */

import type { AuthProviderId } from "./types";

export const AUTH_VERSION = "3000.1.0";

export function getAuthProviderId(): AuthProviderId {
  const raw = process.env.NEXT_PUBLIC_AUTH_PROVIDER?.trim().toLowerCase();
  if (raw === "supabase" || raw === "authjs" || raw === "local") return raw;
  return "local";
}

export function isAuthEnabled(): boolean {
  return process.env.NEXT_PUBLIC_AUTH_ENABLED !== "false";
}

export function getSupabaseAuthConfig() {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL?.trim(),
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim(),
  };
}

export function getAuthJsConfig() {
  return {
    secret: process.env.AUTH_SECRET?.trim(),
    url: process.env.NEXTAUTH_URL?.trim() ?? "http://localhost:3000",
  };
}
