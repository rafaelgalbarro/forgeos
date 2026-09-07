/**
 * In-process cache for research snapshots — worker-friendly / non-blocking UI polls.
 */

import type { ResearchDashboardSnapshot } from "./types";

type CacheEntry = {
  readonly expiresAt: number;
  readonly snapshot: ResearchDashboardSnapshot;
};

const g = globalThis as typeof globalThis & {
  __forgeosResearchCache?: Map<string, CacheEntry>;
};

function store(): Map<string, CacheEntry> {
  if (!g.__forgeosResearchCache) g.__forgeosResearchCache = new Map();
  return g.__forgeosResearchCache;
}

export function researchCacheKey(symbols: readonly string[]): string {
  return [...symbols].map((s) => s.toUpperCase()).sort().join(",") || "default";
}

export function getCachedResearchSnapshot(
  key: string,
): ResearchDashboardSnapshot | null {
  const entry = store().get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store().delete(key);
    return null;
  }
  return { ...entry.snapshot, cacheHit: true };
}

export function setCachedResearchSnapshot(
  key: string,
  snapshot: ResearchDashboardSnapshot,
  ttlMs = 30_000,
): void {
  store().set(key, {
    expiresAt: Date.now() + ttlMs,
    snapshot: { ...snapshot, cacheHit: false },
  });
}

export function clearResearchCache(): void {
  store().clear();
}
