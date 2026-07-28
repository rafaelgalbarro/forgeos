# Schema versioning — PROGRAM 6010

## Strategy

1. **Read** persisted snapshot (any `schemaVersion`)
2. **Migrate in memory** via ordered migrators (`migrators[n]: n → n+1`)
3. **Write** current schema (`CURRENT_SCHEMA_VERSION = 1`)
4. **Backup** older blobs when the persistence adapter deems it appropriate (not domain responsibility)

## Implemented helpers

- `migrateSnapshot` — generic engine (`shared/schema-version.ts`)
- `migrateMissionSnapshot` / `serializeMission`
- `migrateOutputSnapshot` / `serializeOutput`

v0 → v1 migrators ensure defaults (`intention`, `sourceArtifactIds`) and stamp `schemaVersion: 1`.

Snapshots newer than the runtime are rejected (`UNSUPPORTED_SCHEMA`).
