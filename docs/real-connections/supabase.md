# Supabase Connection

**Env:** `SUPABASE_ACCESS_TOKEN`

## Capabilities

- `create_database`

## Operations

| Operation | Mode | Description |
|-----------|------|-------------|
| validate | read-only | List projects |
| create_database | dry-run | Schema + migration plan |
| schema_plan | dry-run | Table definitions |
| migration_plan | dry-run | SQL migration preview |

## Rollback

`rollback_migration` — revert last planned migration.

No real table creation in RC5 default mode.
