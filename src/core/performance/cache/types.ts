/**
 * PROGRAM 6100 — Cache key and entry types.
 */

export type CacheScope = "request" | "read_model" | "artifact";

export interface CacheKey {
  scope: CacheScope;
  namespace: string;
  ventureId?: string;
  workspaceId?: string;
  missionId?: string;
  version?: string;
  id: string;
}

export type CacheFreshness = "LIVE" | "STALE" | "MISSING";

export interface CacheEntry<T> {
  key: string;
  value: T;
  createdAt: string;
  expiresAt: string;
  version: string;
  freshness: CacheFreshness;
  invalidationEvents: string[];
}

export function buildCacheKey(parts: CacheKey): string {
  const segments = [
    parts.scope,
    parts.namespace,
    parts.workspaceId || "_",
    parts.ventureId || "_",
    parts.missionId || "_",
    parts.version || "v1",
    parts.id,
  ];
  return segments.join(":");
}
