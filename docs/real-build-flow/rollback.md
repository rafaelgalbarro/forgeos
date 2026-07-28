# Rollback — Real Build Flow

`buildBuildFlowRollbackPlan()` creates a `ConnectionPlan` with:
- Rollback steps (archive preview, pending migrations, close PR)
- Recovery steps (re-run dry-run, re-approve, restore release package)

`validateBuildFlowRollback()` blocks execution if rollback/recovery missing.
