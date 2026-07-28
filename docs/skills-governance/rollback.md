# Rollback

Rollback and compensation plans for skill executions.

## Plan Structure

Each `RollbackPlan` contains:

- **steps** — Ordered rollback procedure
- **recoveryPlan** — Post-rollback recovery actions
- **compensationActions** — Action-specific compensations

## Action-Based Compensation

| Action Pattern | Compensation |
|----------------|--------------|
| delete/destroy/purge | Restore from snapshot (mock) |
| deploy/publish/release | Revert deployment (mock) |
| create/write/update | Delete/revert resources (mock) |
| read-only | No compensation needed |

## API

- `buildRollbackPlan(skillId, action)` — Generate plan
- `listRollbackPlans()` — Sample plans for lab
