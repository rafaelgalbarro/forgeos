/** Program 6500 — API protection policy */

import type { ApiProtectionPolicy } from "./types";

export function getApiProtectionPolicies(): ApiProtectionPolicy[] {
  return [
    {
      id: "cors-default",
      name: "CORS restrictivo",
      enabled: true,
      rules: ["Origen permitido: mismo host", "Métodos: GET, POST, PUT, DELETE", "Headers: Authorization, Content-Type"],
    },
    {
      id: "auth-required",
      name: "Autenticación en rutas sensibles",
      enabled: true,
      rules: ["/api/billing/*", "/api/admin/*", "/api/execution/*"],
    },
    {
      id: "payload-limit",
      name: "Límite de payload",
      enabled: true,
      rules: ["Max body: 1MB (default)", "Max body AI: 512KB"],
    },
    {
      id: "sql-injection-guard",
      name: "Validación de entrada",
      enabled: true,
      rules: ["Sanitización de query params", "Rechazo de patrones SQLi conocidos"],
    },
  ];
}
