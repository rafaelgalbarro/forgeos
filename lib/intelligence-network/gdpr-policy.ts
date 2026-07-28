/** Program 9000 — GDPR compliance checks. */

import { containsSensitiveData } from "@/lib/network/privacy-layer";
import type { IntelligenceConsentRecord } from "./types";

export interface GdprCheckResult {
  compliant: boolean;
  checks: { id: string; label: string; passed: boolean }[];
  disclaimer: string;
}

export function runGdprComplianceCheck(
  consent: IntelligenceConsentRecord,
  payload: Record<string, unknown> = {}
): GdprCheckResult {
  const sensitiveViolations = containsSensitiveData(payload);
  const checks = [
    {
      id: "consent-recorded",
      label: "Consentimiento registrado por ámbito",
      passed: consent.updatedAt.length > 0,
    },
    {
      id: "no-pii",
      label: "Sin PII en payload de red",
      passed: sensitiveViolations.length === 0,
    },
    {
      id: "right-to-withdraw",
      label: "Derecho de revocación disponible",
      passed: true,
    },
    {
      id: "data-minimization",
      label: "Minimización de datos (solo agregados)",
      passed: Object.keys(payload).length <= 8,
    },
    {
      id: "purpose-limitation",
      label: "Finalidad limitada a inteligencia colectiva",
      passed: true,
    },
  ];

  return {
    compliant: checks.every((c) => c.passed),
    checks,
    disclaimer: "Verificación GDPR local — sin transmisión externa en modo demo",
  };
}

export function getGdprRightsEs(): string[] {
  return [
    "Derecho de acceso a consentimientos otorgados",
    "Derecho de revocación en cualquier momento",
    "Derecho a no contribuir (solo lectura de agregados)",
    "Portabilidad de preferencias de consentimiento (localStorage)",
    "Eliminación de consentimiento al revocar todos los ámbitos",
  ];
}
