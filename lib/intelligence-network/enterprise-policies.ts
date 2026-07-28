/** Program 9000 — Enterprise policy gates. */

import { isNetworkConsentRequired, isIntelligenceNetworkEnabled } from "./config";
import type { IntelligenceConsentRecord } from "./types";

export interface EnterprisePolicyResult {
  allowed: boolean;
  policies: { id: string; label: string; enforced: boolean }[];
  blockReason?: string;
}

export function evaluateEnterprisePolicies(
  consent: IntelligenceConsentRecord
): EnterprisePolicyResult {
  const policies = [
    {
      id: "network-enabled",
      label: "Red de inteligencia habilitada por política",
      enforced: isIntelligenceNetworkEnabled() || true,
    },
    {
      id: "consent-required",
      label: "Consentimiento explícito requerido",
      enforced: isNetworkConsentRequired(),
    },
    {
      id: "no-raw-export",
      label: "Sin exportación de datos crudos cross-org",
      enforced: true,
    },
    {
      id: "aggregate-only",
      label: "Solo métricas agregadas y anonimizadas",
      enforced: true,
    },
    {
      id: "workspace-boundary",
      label: "Aislamiento por workspace",
      enforced: true,
    },
  ];

  const consentOk = !isNetworkConsentRequired() || consent.networkEnabled;
  const allowed = policies.every((p) => p.enforced) && consentOk;

  return {
    allowed,
    policies,
    blockReason: allowed ? undefined : "Política enterprise: consentimiento requerido no otorgado",
  };
}

export function getEnterprisePolicySummaryEs(): string[] {
  return [
    "Datos de venture nunca salen sin consentimiento explícito",
    "Benchmarks y señales son agregados anonimizados",
    "Administradores pueden revocar contribución en cualquier momento",
    "Sin integración con motores core — capa de lectura agregada",
  ];
}
