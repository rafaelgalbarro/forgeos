/** In-memory TTL cache for server-side market data. */

type CacheEntry<T> = { value: T; expiresAt: number };

const store = new Map<string, CacheEntry<unknown>>();

export function getCached<T>(key: string): T | null {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return null;
  }
  return entry.value as T;
}

/** Return value even if expired (caller may serve stale while refreshing). */
export function peekCached<T>(key: string): { value: T; fresh: boolean } | null {
  const entry = store.get(key);
  if (!entry) return null;
  return {
    value: entry.value as T,
    fresh: Date.now() <= entry.expiresAt,
  };
}

export function setCached<T>(key: string, value: T, ttlMs: number): void {
  store.set(key, { value, expiresAt: Date.now() + Math.max(0, ttlMs) });
}

export function cacheKey(prefix: string, ...parts: string[]): string {
  return `${prefix}:${parts.join(":")}`.toUpperCase();
}

const inflight = new Map<string, Promise<unknown>>();

/** Dedup concurrent loaders for the same key; cache successful results. */
export async function getOrSetCached<T>(
  key: string,
  ttlMs: number,
  loader: () => Promise<T>,
): Promise<T> {
  const hit = getCached<T>(key);
  if (hit !== null) return hit;

  const existing = inflight.get(key) as Promise<T> | undefined;
  if (existing) return existing;

  const promise = (async () => {
    try {
      const value = await loader();
      setCached(key, value, ttlMs);
      return value;
    } finally {
      inflight.delete(key);
    }
  })();

  inflight.set(key, promise);
  return promise;
}

export function clearMarketDataCache(): void {
  store.clear();
  inflight.clear();
}
