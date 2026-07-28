/** Program 4500 — Auth flow generator. */

import type { AuthConfig } from "./types";

export function generateAuthConfig(name: string): AuthConfig {
  return {
    provider: "supabase-auth",
    methods: ["email", "oauth", "magic-link"],
    roles: ["user", "admin", "viewer"],
    flows: [
      { name: "Login", screens: ["/login", "/forgot-password"] },
      { name: "Registro", screens: ["/register", "/verify-email"] },
      { name: "OAuth", screens: ["/auth/callback"] },
    ],
    sessionStrategy: "jwt",
  };
}

export function formatAuthSummary(auth: AuthConfig): string {
  return `${auth.methods.length} métodos · ${auth.roles.length} roles · ${auth.provider}`;
}
