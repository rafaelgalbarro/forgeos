# Data migration

Runners live under `src/core/migration/runners/`:

- `migrate-v2-missions.ts`
- `migrate-v2-decisions.ts`
- `migrate-v2-outputs.ts`
- shared `runIdempotentMigrator` in `types.ts`

CLI entrypoints:

- `scripts/migrate-v2-missions.ts`
- `scripts/migrate-v2-decisions.ts`
- `scripts/migrate-v2-outputs.ts`

## Before write

1. Backup path recorded (operator-provided)
2. Legacy count
3. Legacy checksum (sha256 short)
4. Schema check (required keys)

Abort on schema failure — **no write**.

## After write

1. V2 count + checksum
2. Relationship / orphan detection
3. Report (`DataMigrationReport`) with `idempotent: true`

## Defaults

Migrators default to **`dryRun: true`**. Never delete legacy before validation.
