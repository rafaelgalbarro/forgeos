/** RC10 — Anonymization engine for aggregated network statistics. */

import type { AnonymizedMetric, NetworkContext } from "./types";
import { DEMO_DISCLAIMER } from "./types";

const MIN_SAMPLE_SIZE = 5;

export function anonymizeValue(raw: number): number {
  const bucket = Math.round(raw / 10) * 10;
  return Math.max(bucket, 0);
}

export function anonymizeOrgId(organizationId: string): string {
  let hash = 0;
  for (let i = 0; i < organizationId.length; i++) {
    hash = (hash << 5) - hash + organizationId.charCodeAt(i);
    hash |= 0;
  }
  return `anon-org-${Math.abs(hash).toString(36).slice(0, 8)}`;
}

export function buildAnonymizedMetric(
  label: string,
  rawValue: number,
  unit: string,
  sector: string,
  sampleSize: number
): AnonymizedMetric {
  return {
    id: `anon-${label.toLowerCase().replace(/\s+/g, "-")}`,
    label,
    value: anonymizeValue(rawValue),
    unit,
    sampleSize: Math.max(sampleSize, MIN_SAMPLE_SIZE),
    sector,
    anonymized: true,
    disclaimer: DEMO_DISCLAIMER,
  };
}

export function stripPrivateFields<T extends Record<string, unknown>>(
  data: T,
  allowedKeys: (keyof T)[]
): Partial<T> {
  const result: Partial<T> = {};
  for (const key of allowedKeys) {
    if (key in data) {
      result[key] = data[key];
    }
  }
  return result;
}

export function buildAnonymizedContribution(
  ctx: NetworkContext
): Record<string, unknown> {
  return {
    sector: ctx.sector,
    anonymizedOrg: anonymizeOrgId(ctx.organizationId),
    revenueBucket: ctx.monthlyRevenue
      ? anonymizeValue(ctx.monthlyRevenue)
      : undefined,
    growthBucket: ctx.mrrGrowthPct
      ? anonymizeValue(ctx.mrrGrowthPct)
      : undefined,
    pricingBucket: ctx.pricingPlanEur
      ? anonymizeValue(ctx.pricingPlanEur)
      : undefined,
    disclaimer: DEMO_DISCLAIMER,
  };
}

export function createDemoAnonymizedSample(sector: string): AnonymizedMetric {
  return buildAnonymizedMetric("Crecimiento MRR mediano", 21, "%", sector, 47);
}
