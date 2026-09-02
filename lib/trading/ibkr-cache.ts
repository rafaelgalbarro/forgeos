import "server-only";

import {
  cacheKey,
  getCached,
  getOrSetCached,
  invalidateCacheByPrefix,
  peekCached,
} from "@/lib/market-data/cache";

/** Aggressive read cache — avoid hammering TWS on every dashboard poll. */
export const IBKR_READ_CACHE_TTL_MS = 5 * 60 * 1000;
/** Live market-data / price cache — 30s for realtime trailing. */
export const IBKR_PRICE_CACHE_TTL_MS = 30_000;

export function ibkrCacheKey(kind: string, ...parts: string[]): string {
  return cacheKey("IBKR", kind, ...parts);
}

export function peekIbkrCached<T>(key: string): { value: T; fresh: boolean } | null {
  return peekCached<T>(key);
}

export async function getOrSetIbkrCached<T>(
  key: string,
  loader: () => Promise<T>,
  ttlMs: number = IBKR_READ_CACHE_TTL_MS,
): Promise<T> {
  const hit = getCached<T>(key);
  if (hit !== null) return hit;
  return getOrSetCached(key, ttlMs, loader);
}

/** Call after reconnect or when IBKR pushes a fresh update. */
export function invalidateIbkrReadCache(): void {
  invalidateCacheByPrefix("IBKR:");
}
