/**
 * PROGRAM 6100 — Artifact metadata cache (never caches full file contents).
 */

import { buildCacheKey, type CacheEntry, type CacheKey } from "./types";

export interface ArtifactMetadata {
  artifactId: string;
  ventureId: string;
  missionId?: string;
  kind: string;
  sizeBytes: number;
  mimeType?: string;
  thumbnailUrl?: string;
  cardUrl?: string;
  previewUrl?: string;
  fullUrl?: string;
  updatedAt: string;
}

const artifactMetadataCache = new Map<string, CacheEntry<ArtifactMetadata>>();

export function artifactCacheGet(key: CacheKey): ArtifactMetadata | undefined {
  const cacheKey = buildCacheKey({ ...key, scope: "artifact" });
  const entry = artifactMetadataCache.get(cacheKey);
  if (!entry) return undefined;
  if (new Date(entry.expiresAt).getTime() < Date.now()) {
    artifactMetadataCache.delete(cacheKey);
    return undefined;
  }
  return entry.value;
}

export function artifactCacheSet(
  key: CacheKey,
  metadata: ArtifactMetadata,
  ttlMs = 300_000,
): void {
  const now = Date.now();
  const cacheKey = buildCacheKey({ ...key, scope: "artifact" });
  artifactMetadataCache.set(cacheKey, {
    key: cacheKey,
    value: metadata,
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + ttlMs).toISOString(),
    version: key.version || "v1",
    freshness: "LIVE",
    invalidationEvents: ["OutputStatusChanged"],
  });
}

export function artifactCacheInvalidateForVenture(ventureId: string): number {
  let removed = 0;
  for (const [k, entry] of artifactMetadataCache) {
    if (k.includes(`:${ventureId}:`) || entry.value.ventureId === ventureId) {
      artifactMetadataCache.delete(k);
      removed += 1;
    }
  }
  return removed;
}

export function resetArtifactCache(): void {
  artifactMetadataCache.clear();
}
