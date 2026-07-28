# Rollback

Helpers: `src/core/migration/rollback.ts`

CLI: `scripts/rollback-v2.ts --component <id>` or `--full`

Each registry entry includes:

| Field | Meaning |
|-------|---------|
| trigger | When to roll back |
| scope | What is affected |
| dataImpact | Data consequences |
| rollbackCommand | Operator command |
| validation | How to prove rollback |
| limitations | What rollback does **not** undo |

## Full legacy rollback

`planFullLegacyRollback()` → set all `ENABLE_V2_*` to `false`, restart, smoke main routes.

V2 additive stores are **not deleted** — they become unread. Deletion only after deprecation gates.
