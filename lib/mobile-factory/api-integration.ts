/** Program 4600 — API client scaffold generator. */

import type { ApiIntegrationScaffold, ScreenDefinition, Template } from "./types";

export function generateApiIntegration(
  template: Template,
  projectSlug: string,
  screens: ScreenDefinition[]
): ApiIntegrationScaffold {
  const baseUrl = `https://api.forgeos.dev/${projectSlug}`;

  const endpoints = [
    { method: "GET", path: "/health", description: "Health check" },
    { method: "POST", path: "/auth/login", description: "Inicio de sesión" },
    { method: "GET", path: "/users/me", description: "Perfil del usuario" },
    ...screens
      .filter((s) => !["Splash", "NotFound", "Login", "Register"].includes(s.name))
      .slice(0, 4)
      .map((s) => ({
        method: "GET",
        path: `/resources/${s.name.toLowerCase()}`,
        description: `Datos para ${s.title}`,
      })),
  ];

  if (template.category === "marketplace") {
    endpoints.push(
      { method: "GET", path: "/products", description: "Catálogo de productos" },
      { method: "POST", path: "/orders", description: "Crear pedido" }
    );
  }

  return {
    baseUrl,
    clientFile: "src/lib/api-client.ts",
    authHeader: "Authorization: Bearer {token}",
    endpoints,
    errorHandling: [
      "401 → redirect a Login",
      "403 → mostrar permisos insuficientes",
      "5xx → retry con backoff exponencial",
      "NetworkError → modo offline con cache",
    ],
  };
}

export function formatApiSummary(api: ApiIntegrationScaffold): string {
  return `${api.endpoints.length} endpoints · ${api.clientFile}`;
}
