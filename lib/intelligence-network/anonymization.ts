/** Program 9000 — Anonymization layer (aggregate only, no PII). */

export {
  anonymizeValue,
  anonymizeOrgId,
  buildAnonymizedMetric,
  stripPrivateFields,
  buildAnonymizedContribution,
  createDemoAnonymizedSample,
} from "@/lib/network/anonymization-engine";

import {
  buildAnonymizedMetric,
  buildAnonymizedContribution,
  stripPrivateFields,
} from "@/lib/network/anonymization-engine";
import type { AnonymizedMetric, NetworkContext } from "@/lib/network/types";
import { DEMO_DISCLAIMER } from "@/lib/network/types";

const ALLOWED_CONTRIBUTION_KEYS = [
  "sector",
  "anonymizedOrg",
  "revenueBucket",
  "growthBucket",
  "pricingBucket",
  "disclaimer",
] as const;

export function sanitizeForNetwork(
  payload: Record<string, unknown>
): Record<string, unknown> {
  return stripPrivateFields(payload, [...ALLOWED_CONTRIBUTION_KEYS]);
}

export function buildAnonymousMetrics(ctx: NetworkContext): AnonymizedMetric[] {
  const sector = ctx.sector;
  return [
    buildAnonymizedMetric("Crecimiento MRR mediano", ctx.mrrGrowthPct ?? 12, "%", sector, 47),
    buildAnonymizedMetric("Precio plan mediano", ctx.pricingPlanEur ?? 29, "€/mes", sector, 47),
    buildAnonymizedMetric("Ingresos mensuales (bucket)", ctx.monthlyRevenue ?? 4200, "€", sector, 47),
    buildAnonymizedMetric("Churn mediano sector", 4.2, "%", sector, 47),
  ];
}

export function assertAnonymizedOnly(payload: Record<string, unknown>): boolean {
  const forbidden = ["email", "name", "phone", "ventureName", "organizationId", "ventureId"];
  return !Object.keys(payload).some((k) => forbidden.includes(k));
}

export function prepareAnonymizedContribution(
  ctx: NetworkContext
): Record<string, unknown> {
  const raw = buildAnonymizedContribution(ctx);
  if (!assertAnonymizedOnly(raw)) {
    return { disclaimer: DEMO_DISCLAIMER, error: "PII detectada — contribución bloqueada" };
  }
  return sanitizeForNetwork(raw);
}
