/**
 * Schema versioning helpers — PROGRAM 6010
 *
 * Strategy: read old → migrate in memory → write current → backup when appropriate.
 * Persistence adapters own backup; domain only migrates snapshots in memory.
 */

import { DomainError } from "./errors";
import { err, ok, type Result } from "./result";
import { CURRENT_SCHEMA_VERSION, type SchemaVersion } from "./value-objects";

export type VersionedSnapshot = Readonly<{
  schemaVersion: SchemaVersion;
  [key: string]: unknown;
}>;

export type Migrator = (snapshot: VersionedSnapshot) => Result<VersionedSnapshot, DomainError>;

/**
 * Apply migrators sequentially from snapshot.schemaVersion up to target.
 * migrators[n] migrates from version n → n+1.
 */
export function migrateSnapshot(
  snapshot: VersionedSnapshot,
  migrators: ReadonlyArray<Migrator>,
  targetVersion: SchemaVersion = CURRENT_SCHEMA_VERSION
): Result<VersionedSnapshot, DomainError> {
  let current: VersionedSnapshot = { ...snapshot };
  let version = Number(current.schemaVersion ?? 0);

  if (!Number.isInteger(version) || version < 0) {
    return err(DomainError.unsupportedSchema("Snapshot", version));
  }
  if (version > targetVersion) {
    return err(
      DomainError.unsupportedSchema("Snapshot", version, {
        reason: "snapshot newer than runtime",
        targetVersion,
      })
    );
  }

  while (version < targetVersion) {
    const migrator = migrators[version];
    if (!migrator) {
      return err(
        DomainError.unsupportedSchema("Snapshot", version, {
          reason: "missing migrator",
          targetVersion,
        })
      );
    }
    const next = migrator(current);
    if (!next.ok) return next;

    const nextVersion = Number(next.value.schemaVersion);
    if (!Number.isInteger(nextVersion) || nextVersion <= version) {
      return err(
        DomainError.invariant("Snapshot", "Migrator did not advance schemaVersion", {
          from: version,
          to: nextVersion,
        })
      );
    }
    current = next.value;
    version = nextVersion;
  }

  return ok({ ...current, schemaVersion: targetVersion });
}

export function withCurrentSchemaVersion<T extends Record<string, unknown>>(
  data: T
): T & { schemaVersion: typeof CURRENT_SCHEMA_VERSION } {
  return { ...data, schemaVersion: CURRENT_SCHEMA_VERSION };
}
