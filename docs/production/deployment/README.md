# Deployment

## Pre-deploy gates

Evaluated by `deployment-gates.ts`:

1. Production checklist score ≥ 70%
2. Environment validation pass
3. Kill switch inactive
4. Migrations applied
5. Build pipeline approval policy

## Dashboard

- `/releases` — release history and gate status
- `/production` — overall health before deploy

## Flags

- `PRODUCTION_DRY_RUN=true` — no real deploy (default)
- `ENABLE_REAL_BUILD_FLOW` — see build pipeline docs (RC5.2)

## Checklist

Run auto-checklist at `/health` before any production deploy.
