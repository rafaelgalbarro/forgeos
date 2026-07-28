/** Program 7000 — Public API docs index */

import { PUBLIC_API_ENDPOINTS, PUBLIC_API_VERSION } from "@/lib/commercial/public-api";
import type { ApiDocEntry } from "./types";

export const PUBLIC_API_DOCS: ApiDocEntry[] = [
  {
    id: "plans",
    method: "GET",
    path: PUBLIC_API_ENDPOINTS.plans,
    summary: "Lista planes comerciales disponibles.",
    planRequired: "starter",
  },
  {
    id: "subscription",
    method: "GET",
    path: PUBLIC_API_ENDPOINTS.subscription,
    summary: "Suscripción activa de la organización.",
    planRequired: "pro",
  },
  {
    id: "usage",
    method: "GET",
    path: PUBLIC_API_ENDPOINTS.usage,
    summary: "Métricas de uso y límites del plan.",
    planRequired: "pro",
  },
  {
    id: "invoices",
    method: "GET",
    path: PUBLIC_API_ENDPOINTS.invoices,
    summary: "Facturas emitidas (dry-run en beta).",
    planRequired: "business",
  },
  {
    id: "api-keys",
    method: "POST",
    path: PUBLIC_API_ENDPOINTS.apiKeys,
    summary: "Crear y rotar claves API.",
    planRequired: "business",
  },
];

export function listPublicApiDocs(): ApiDocEntry[] {
  return PUBLIC_API_DOCS;
}

export function getPublicApiVersion(): string {
  return PUBLIC_API_VERSION;
}
