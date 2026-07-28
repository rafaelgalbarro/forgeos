/** Program 6000 — Usage counters per plan */

import { readStorage, writeStorage } from "@/lib/beta-platform/storage";
import { COMMERCIAL_STORAGE_KEYS } from "./config";
import { getPlan } from "./plans";
import { getSubscription } from "./subscriptions";
import type { CommercialPlanId, UsageCounter } from "./types";

const DEFAULT_LIMITS: Record<CommercialPlanId, Record<string, number>> = {
  starter: { ventures: 1, ai_calls: 100, api_requests: 0 },
  pro: { ventures: 5, ai_calls: 2000, api_requests: 1000 },
  business: { ventures: 999, ai_calls: 10000, api_requests: 50000 },
  enterprise: { ventures: 999, ai_calls: 999999, api_requests: 999999 },
};

function readUsage(): UsageCounter[] {
  return readStorage<UsageCounter[]>(COMMERCIAL_STORAGE_KEYS.usage, []);
}

function writeUsage(counters: UsageCounter[]): void {
  writeStorage(COMMERCIAL_STORAGE_KEYS.usage, counters);
}

function ensureCounters(orgId: string, planId: CommercialPlanId): UsageCounter[] {
  const limits = DEFAULT_LIMITS[planId];
  const existing = readUsage().filter((c) => c.orgId === orgId);
  if (existing.length >= Object.keys(limits).length) return existing;

  const period = new Date().toISOString().slice(0, 7);
  const labels: Record<string, string> = {
    ventures: "Ventures activas",
    ai_calls: "Llamadas AI",
    api_requests: "Peticiones API",
  };

  const created: UsageCounter[] = Object.entries(limits).map(([metric, limit]) => ({
    id: `${orgId}_${metric}`,
    orgId,
    metric,
    label: labels[metric] ?? metric,
    used: metric === "ventures" ? 1 : 0,
    limit,
    unit: metric === "ventures" ? "ventures" : "req",
    period,
  }));

  const merged = [
    ...readUsage().filter((c) => c.orgId !== orgId),
    ...created,
  ];
  writeUsage(merged);
  return created;
}

export function getUsageSummary(orgId?: string): UsageCounter[] {
  const sub = getSubscription(orgId);
  if (!sub) return [];
  return ensureCounters(sub.orgId, sub.planId);
}

export function incrementUsage(orgId: string, metric: string, amount = 1): UsageCounter | null {
  const counters = readUsage();
  const idx = counters.findIndex((c) => c.orgId === orgId && c.metric === metric);
  if (idx < 0) return null;
  counters[idx] = { ...counters[idx], used: counters[idx].used + amount };
  writeUsage(counters);
  return counters[idx];
}

export function isWithinLimit(orgId: string, metric: string): boolean {
  const counter = getUsageSummary(orgId).find((c) => c.metric === metric);
  if (!counter) return true;
  return counter.used < counter.limit;
}

export function getPlanLimits(planId: CommercialPlanId): Record<string, number> {
  return DEFAULT_LIMITS[planId];
}
