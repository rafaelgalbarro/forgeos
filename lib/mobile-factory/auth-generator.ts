/** Program 4600 — Authentication flow scaffold generator. */

import type { AuthFlowScaffold, Template } from "./types";

export function generateAuthFlow(template: Template, projectSlug: string): AuthFlowScaffold {
  const useOAuth = template.category === "social";
  const useBiometric = template.category === "fintech";

  const provider: AuthFlowScaffold["provider"] = useBiometric
    ? "biometric"
    : useOAuth
      ? "oauth"
      : "email";

  const screens =
    provider === "oauth"
      ? ["LoginScreen", "OAuthCallbackScreen", "ProfileSetupScreen"]
      : provider === "biometric"
        ? ["BiometricPromptScreen", "PinFallbackScreen", "LoginScreen"]
        : ["LoginScreen", "RegisterScreen", "ForgotPasswordScreen"];

  return {
    provider,
    screens,
    tokenStorage: provider === "biometric" ? "secure-store" : "async-storage",
    refreshStrategy: "jwt-refresh",
    endpoints: {
      login: `/api/v1/${projectSlug}/auth/login`,
      register: `/api/v1/${projectSlug}/auth/register`,
      logout: `/api/v1/${projectSlug}/auth/logout`,
      refresh: `/api/v1/${projectSlug}/auth/refresh`,
    },
  };
}

export function formatAuthSummary(auth: AuthFlowScaffold): string {
  return `${auth.provider} · ${auth.screens.length} pantallas · ${auth.tokenStorage}`;
}
