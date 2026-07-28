/**
 * Output schema migrators — PROGRAM 6010
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
import type { OutputProps } from "./entity";

const migrateOutputV0toV1: Migrator = (snap) =>
  ok({
    ...snap,
    sourceArtifactIds: (snap.sourceArtifactIds as unknown[]) ?? [],
    schemaVersion: 1,
  });

export const OUTPUT_MIGRATORS: readonly Migrator[] = [migrateOutputV0toV1];

export function migrateOutputSnapshot(
  snapshot: VersionedSnapshot
): Result<OutputProps, DomainError> {
  const migrated = migrateSnapshot(snapshot, OUTPUT_MIGRATORS, CURRENT_SCHEMA_VERSION);
  if (!migrated.ok) return migrated;
  const s = migrated.value;
  if (!s.id || !s.workspaceId || !s.missionId || !s.type || !s.title || !s.status) {
    return err(DomainError.validation("Output snapshot missing required fields"));
  }
  return ok(s as unknown as OutputProps);
}

export function serializeOutput(props: OutputProps): OutputProps & { schemaVersion: number } {
  return withCurrentSchemaVersion({ ...props });
}
