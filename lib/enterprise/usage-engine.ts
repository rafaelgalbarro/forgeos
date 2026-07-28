/** ForgeOS RC11 — Usage metering engine (demo). */

import { readStorage, writeStorage } from "@/lib/intelligence-layer/memory/storage";
import { STORAGE_KEYS } from "@/lib/intelligence-layer/memory/types";
import { getActiveOrganization, getOrganization } from "./organization-engine";
import { getPlanDefinition } from "./billing-engine";
import type { UsageMetric } from "./types";

function planLimits(plan: string) {
  if (plan === "enterprise") return { ai: 500000, storage: 500, api: 100000 };
  if (plan === "pro") return { ai: 50000, storage: 50, api: 10000 };
  return { ai: 5000, storage: 5, api: 1000 };
}

export function buildUsageMetrics(orgId?: string): UsageMetric[] {
  const org = orgId ? getOrganization(orgId) : getActiveOrganization();
  if (!org) return [];

  const limits = planLimits(org.plan);
  const stored = readStorage<Record<string, UsageMetric[]>>(STORAGE_KEYS.enterpriseUsage, {});
  if (stored[org.id]) return stored[org.id];

  const period = new Date().toISOString().slice(0, 7);
  const metrics: UsageMetric[] = [
    { id: "ai_tokens", orgId: org.id, label: "Tokens IA", used: Math.floor(limits.ai * 0.34), limit: limits.ai, unit: "tokens", period },
    { id: "storage", orgId: org.id, label: "Almacenamiento", used: Math.floor(limits.storage * 0.22), limit: limits.storage, unit: "GB", period },
    { id: "api_calls", orgId: org.id, label: "Llamadas API", used: Math.floor(limits.api * 0.18), limit: limits.api, unit: "calls", period },
    { id: "ventures", orgId: org.id, label: "Ventures activas", used: 2, limit: org.plan === "free" ? 3 : org.plan === "pro" ? 15 : 999, unit: "ventures", period },
  ];

  stored[org.id] = metrics;
  writeStorage(STORAGE_KEYS.enterpriseUsage, stored);
  return metrics;
}

export function incrementUsage(metricId: string, amount = 1): UsageMetric[] {
  const org = getActiveOrganization();
  if (!org) return [];

  const stored = readStorage<Record<string, UsageMetric[]>>(STORAGE_KEYS.enterpriseUsage, {});
  const metrics = stored[org.id] ?? buildUsageMetrics(org.id);

  const updated = metrics.map((m) =>
    m.id === metricId ? { ...m, used: Math.min(m.used + amount, m.limit) } : m
  );

  stored[org.id] = updated;
  writeStorage(STORAGE_KEYS.enterpriseUsage, stored);
  return updated;
}

export function getUsagePercent(metric: UsageMetric): number {
  if (metric.limit <= 0) return 0;
  return Math.round((metric.used / metric.limit) * 100);
}
