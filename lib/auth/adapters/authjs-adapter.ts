/** Program 3000 — Auth.js adapter (stub; requires next-auth when enabled). */

import type { AuthProvider } from "../provider-interface";
import { getAuthJsConfig } from "../config";
import { localAuthAdapter } from "./local-adapter";

function notConfigured(): boolean {
  return !getAuthJsConfig().secret;
}

export const authJsAdapter: AuthProvider = {
  id: "authjs",

  async login(input) {
    if (notConfigured()) {
      return { success: false, error: "Auth.js no configurado. Define AUTH_SECRET." };
    }
    return localAuthAdapter.login(input);
  },

  async register(input) {
    if (notConfigured()) return { success: false, error: "Auth.js no configurado." };
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
