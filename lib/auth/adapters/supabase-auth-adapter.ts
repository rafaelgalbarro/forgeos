/** Program 3000 — Supabase Auth adapter (stub; requires @supabase/supabase-js). */

import type { AuthProvider } from "../provider-interface";
import { getSupabaseAuthConfig } from "../config";
import { localAuthAdapter } from "./local-adapter";

function notConfigured(): boolean {
  const cfg = getSupabaseAuthConfig();
  return !cfg.url || !cfg.anonKey;
}

export const supabaseAuthAdapter: AuthProvider = {
  id: "supabase",

  async login(input) {
    if (notConfigured()) {
      return {
        success: false,
        error: "Supabase Auth no configurado. Define NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY.",
      };
    }
    // Placeholder: integrate @supabase/supabase-js signInWithPassword
    return localAuthAdapter.login(input);
  },

  async register(input) {
    if (notConfigured()) {
      return { success: false, error: "Supabase Auth no configurado." };
    }
    return localAuthAdapter.register(input);
  },

  async logout() {
    return localAuthAdapter.logout();
  },

  async getSession() {
    if (notConfigured()) return localAuthAdapter.getSession();
    return localAuthAdapter.getSession();
  },

  async forgotPassword(email) {
    if (notConfigured()) {
      return { success: false, message: "Supabase Auth no configurado." };
    }
    return localAuthAdapter.forgotPassword(email);
  },

  async verifyEmail(token) {
    return localAuthAdapter.verifyEmail(token);
  },

  async updateProfile(userId, input) {
    return localAuthAdapter.updateProfile(userId, input);
  },

  async resendVerificationEmail(email) {
    return localAuthAdapter.resendVerificationEmail(email);
  },
};
