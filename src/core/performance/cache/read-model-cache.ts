/**
 * PROGRAM 6100 — Read model cache with venture-scoped keys and event invalidation.
 */

import { buildCacheKey, type CacheEntry, type CacheFreshness, type CacheKey } from "./types";

const globalReadModelCache = new Map<string, CacheEntry<unknown>>();

const INVALIDATION_MAP: Record<string, string[]> = {
  MissionSummaryChanged: ["mission-card", "mission-summary", "portfolio-summary"],
  VentureCardChanged: ["venture-card", "company-health", "portfolio-summary"],
  CompanyHealthChanged: ["company-health", "company-dashboard"],
  OutputStatusChanged: ["output-status", "output-summary"],
  WorkflowProgressChanged: ["workflow-progress", "mission-summary"],
  ReleaseStatusChanged: ["release-status", "company-health"],
};

export function readModelCacheGet<T>(key: CacheKey): { value: T; freshness: CacheFreshness } | undefined {
  const cacheKey = buildCacheKey({ ...key, scope: "read_model" });
  const entry = globalReadModelCache.get(cacheKey);
  if (!entry) return undefined;
  if (new Date(entry.expiresAt).getTime() < Date.now()) {
    entry.freshness = "STALE";
    return { value: entry.value as T, freshness: "STALE" };
  }
  return { value: entry.value as T, freshness: entry.freshness };
}

export function readModelCacheSet<T>(
  key: CacheKey,
  value: T,
  options?: { ttlMs?: number; invalidationEvents?: string[] },
): void {
  const ttlMs = options?.ttlMs ?? 60_000;
  const now = Date.now();
  const cacheKey = buildCacheKey({ ...key, scope: "read_model" });
  const entry: CacheEntry<T> = {
    key: cacheKey,
    value,
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + ttlMs).toISOString(),
    version: key.version || "v1",
    freshness: "LIVE",
    invalidationEvents: options?.invalidationEvents || [],
  };
  globalReadModelCache.set(cacheKey, entry as CacheEntry<unknown>);
}

export function invalidateByEvent(eventType: string, ventureId?: string): number {
  const namespaces = INVALIDATION_MAP[eventType] || [];
  let removed = 0;
  for (const [k, entry] of globalReadModelCache) {
    const matchesEvent = entry.invalidationEvents.includes(eventType) ||
      namespaces.some((ns) => k.includes(`:${ns}:`));
    const matchesVenture = !ventureId || k.includes(`:${ventureId}:`);
    if (matchesEvent && matchesVenture) {
      entry.freshness = "STALE";
      globalReadModelCache.delete(k);
      removed += 1;
    }
  }
  return removed;
}

export function invalidateVentureCache(ventureId: string): number {
  let removed = 0;
  for (const [k] of globalReadModelCache) {
    // Cache key: scope:namespace:workspaceId:ventureId:missionId:version:id
    const parts = k.split(":");
    const keyVentureId = parts[3];
    if (keyVentureId === ventureId) {
      globalReadModelCache.delete(k);
      removed += 1;
    }
  }
  return removed;
}

export function readModelCacheStats(): { entries: number; stale: number } {
  let stale = 0;
  for (const entry of globalReadModelCache.values()) {
    if (entry.freshness === "STALE" || new Date(entry.expiresAt).getTime() < Date.now()) stale += 1;
  }
  return { entries: globalReadModelCache.size, stale };
}

/** Test helper — clear all entries. */
export function resetReadModelCache(): void {
  globalReadModelCache.clear();
}
