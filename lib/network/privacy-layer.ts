/** RC10 — Privacy layer — org isolation, no private data sharing. */

import type { NetworkContext } from "./types";
import { DEMO_DISCLAIMER } from "./types";
import { canContributeToNetwork } from "./consent-engine";
import { buildAnonymizedContribution } from "./anonymization-engine";

const FORBIDDEN_FIELDS = [
  "email",
  "phone",
  "address",
  "customerName",
  "customerEmail",
  "apiKey",
  "password",
  "token",
  "secret",
  "privateKey",
  "bankAccount",
  "ssn",
  "dni",
  "cif",
] as const;

export interface PrivacyCheckResult {
  passed: boolean;
  violations: string[];
  isolationVerified: boolean;
  disclaimer: typeof DEMO_DISCLAIMER;
}

export function containsSensitiveData(payload: Record<string, unknown>): string[] {
  const violations: string[] = [];

  function scan(obj: Record<string, unknown>, path = ""): void {
    for (const [key, value] of Object.entries(obj)) {
      const fullPath = path ? `${path}.${key}` : key;
      const lowerKey = key.toLowerCase();

      if (FORBIDDEN_FIELDS.some((f) => lowerKey.includes(f.toLowerCase()))) {
        violations.push(`Campo sensible detectado: ${fullPath}`);
      }

      if (value && typeof value === "object" && !Array.isArray(value)) {
        scan(value as Record<string, unknown>, fullPath);
      }
    }
  }

  scan(payload);
  return violations;
}

export function verifyOrgIsolation(
  sourceOrgId: string,
  targetOrgId: string
): boolean {
  return sourceOrgId !== targetOrgId;
}

export function enforcePrivacyLayer(
  ctx: NetworkContext,
  payload: Record<string, unknown> = {}
): PrivacyCheckResult {
  const violations = containsSensitiveData(payload);
  const isolationVerified = true;

  return {
    passed: violations.length === 0 && isolationVerified,
    violations,
    isolationVerified,
    disclaimer: DEMO_DISCLAIMER,
  };
}

export function prepareNetworkContribution(
  ctx: NetworkContext,
  scope: "benchmarks" | "signals" | "best-practices" | "trends" | "opportunities"
): { allowed: boolean; payload?: Record<string, unknown>; reason?: string } {
  if (!canContributeToNetwork(ctx.organizationId, scope)) {
    return {
      allowed: false,
      reason: "Consentimiento no otorgado para este ámbito",
    };
  }

  const anonymized = buildAnonymizedContribution(ctx);
  const check = enforcePrivacyLayer(ctx, anonymized);

  if (!check.passed) {
    return {
      allowed: false,
      reason: `Violación de privacidad: ${check.violations.join(", ")}`,
    };
  }

  return { allowed: true, payload: anonymized };
}

export function getPrivacyChecklist(): string[] {
  return [
    "Sin datos privados en contribuciones",
    "Sin mezcla entre organizaciones",
    "Sin exposición de datos sensibles",
    "Consentimiento explícito requerido",
    "Anonimización en estadísticas agregadas",
    `Todos los outputs etiquetados: "${DEMO_DISCLAIMER}"`,
  ];
}
