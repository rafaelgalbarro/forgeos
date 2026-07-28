/**
 * Mission schema migrators — PROGRAM 6010
 */

import { DomainError } from "../shared/errors";
import { err, ok, type Result } from "../shared/result";
import {
  migrateSnapshot,
  type Migrator,
  type VersionedSnapshot,
  withCurrentSchemaVersion,
} from "../shared/schema-version";
import { CURRENT_SCHEMA_VERSION } from "../shared/value-objects";
import type { MissionProps } from "./entity";

/** v0 → v1: ensure intention default and schemaVersion */
const migrateMissionV0toV1: Migrator = (snap) => {
  return ok({
    ...snap,
    intention: (snap.intention as string) ?? "UNSPECIFIED",
    schemaVersion: 1,
  });
};

export const MISSION_MIGRATORS: readonly Migrator[] = [migrateMissionV0toV1];

export function migrateMissionSnapshot(
  snapshot: VersionedSnapshot
): Result<MissionProps, DomainError> {
  const migrated = migrateSnapshot(snapshot, MISSION_MIGRATORS, CURRENT_SCHEMA_VERSION);
  if (!migrated.ok) return migrated;
  const s = migrated.value;
  if (!s.id || !s.workspaceId || !s.founderId || !s.title || !s.status) {
    return err(DomainError.validation("Mission snapshot missing required fields"));
  }
  return ok(s as unknown as MissionProps);
}

export function serializeMission(props: MissionProps): MissionProps & { schemaVersion: number } {
  return withCurrentSchemaVersion({ ...props });
}
