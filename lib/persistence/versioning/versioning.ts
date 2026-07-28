/** Entity versioning for audit trail and rollback. */

import { getLocalAdapter } from "../adapters/local-adapter";
import { PERSISTENCE_CONFIG } from "../config";
import { PERSISTENCE_KEYS, type EntityVersion } from "../types";

function versionKey(entityType: string, entityId: string): string {
  return `${entityType}:${entityId}`;
}

/** Record a new version of an entity. */
export async function recordVersion(
  entityType: string,
  entityId: string,
  snapshot: unknown
): Promise<EntityVersion> {
  const adapter = getLocalAdapter();
  const all = await adapter.read<EntityVersion[]>(
    PERSISTENCE_KEYS.versions,
    []
  );

  const existing = all.filter(
    (v) => v.entityType === entityType && v.entityId === entityId
  );
  const nextVersion =
    existing.length > 0
      ? Math.max(...existing.map((v) => v.version)) + 1
      : 1;

  const entry: EntityVersion = {
    entityType,
    entityId,
    version: nextVersion,
    snapshot,
    createdAt: new Date().toISOString(),
  };

  all.unshift(entry);

  const forEntity = all.filter(
    (v) => v.entityType === entityType && v.entityId === entityId
  );
  if (forEntity.length > PERSISTENCE_CONFIG.maxVersions) {
    const toRemove = forEntity.slice(PERSISTENCE_CONFIG.maxVersions);
    const removeSet = new Set(toRemove.map((v) => `${v.version}:${v.createdAt}`));
    const pruned = all.filter(
      (v) =>
        v.entityType !== entityType ||
        v.entityId !== entityId ||
        !removeSet.has(`${v.version}:${v.createdAt}`)
    );
    await adapter.write(PERSISTENCE_KEYS.versions, pruned);
  } else {
    await adapter.write(PERSISTENCE_KEYS.versions, all);
  }

  return entry;
}

/** Get version history for an entity (newest first). */
export async function getVersionHistory(
  entityType: string,
  entityId: string
): Promise<EntityVersion[]> {
  const adapter = getLocalAdapter();
  const all = await adapter.read<EntityVersion[]>(
    PERSISTENCE_KEYS.versions,
    []
  );
  return all.filter(
    (v) => v.entityType === entityType && v.entityId === entityId
  );
}

/** Get a specific version of an entity. */
export async function getVersion(
  entityType: string,
  entityId: string,
  version: number
): Promise<EntityVersion | null> {
  const history = await getVersionHistory(entityType, entityId);
  return history.find((v) => v.version === version) ?? null;
}

/** Get the latest version number for an entity. */
export async function getLatestVersionNumber(
  entityType: string,
  entityId: string
): Promise<number> {
  const history = await getVersionHistory(entityType, entityId);
  if (history.length === 0) return 0;
  return Math.max(...history.map((v) => v.version));
}

export { versionKey };
