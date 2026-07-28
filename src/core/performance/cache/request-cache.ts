/**
 * PROGRAM 6100 — Request-scoped cache (deduplication within a single request).
 */

import { buildCacheKey, type CacheEntry, type CacheKey } from "./types";

const requestCaches = new WeakMap<object, Map<string, CacheEntry<unknown>>>();

function getRequestStore(requestId: object): Map<string, CacheEntry<unknown>> {
  let store = requestCaches.get(requestId);
  if (!store) {
    store = new Map();
    requestCaches.set(requestId, store);
  }
  return store;
}

export function requestCacheGet<T>(requestId: object, key: CacheKey): T | undefined {
  const store = getRequestStore(requestId);
  const entry = store.get(buildCacheKey(key));
  if (!entry) return undefined;
  if (new Date(entry.expiresAt).getTime() < Date.now()) {
    store.delete(buildCacheKey(key));
    return undefined;
  }
  return entry.value as T;
}

export function requestCacheSet<T>(
  requestId: object,
  key: CacheKey,
  value: T,
  ttlMs = 30_000,
): void {
  const store = getRequestStore(requestId);
  const now = Date.now();
  const entry: CacheEntry<T> = {
    key: buildCacheKey(key),
    value,
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + ttlMs).toISOString(),
    version: key.version || "v1",
    freshness: "LIVE",
    invalidationEvents: [],
  };
  store.set(entry.key, entry as CacheEntry<unknown>);
}

export function requestCacheInvalidate(requestId: object, namespace: string, ventureId?: string): number {
  const store = getRequestStore(requestId);
  let removed = 0;
  for (const [k] of store) {
    const matchNamespace = k.includes(`:${namespace}:`);
    const matchVenture = !ventureId || k.includes(`:${ventureId}:`);
    if (matchNamespace && matchVenture) {
      store.delete(k);
      removed += 1;
    }
  }
  return removed;
}

export function requestCacheClear(requestId: object): void {
  requestCaches.delete(requestId);
}
