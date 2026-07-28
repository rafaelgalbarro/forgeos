# Backup

## Current status (stub)

Program 6500 exposes backup status via `backup-manager.ts`:

- Venture data (localStorage snapshot)
- Config snapshot
- Postgres (when `PERSISTENCE_PROVIDER=postgres`)

## Procedures

1. Verify backup health at `/recovery`
2. Trigger stub backup via API (dry-run)
3. For production: configure external backup provider separately

## Retention

Default retention: 30 days (venture), 90 days (config).
