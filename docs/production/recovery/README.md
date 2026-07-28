# Recovery

## Procedures (stub)

Available at `/recovery`:

- Restart workers
- Clear dead-letter queue
- AI fallback activation

All procedures run in **dry-run** mode by default.

## Disaster Recovery

- RTO: 60 minutes (target)
- RPO: 15 minutes (target)
- Plan status: draft until external DR is configured

## Rollback

Use `/releases` gates + `rollback-manager.ts` for release rollback steps.
