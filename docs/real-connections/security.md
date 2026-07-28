# Security

## Mandatory rules

| Rule | Implementation |
|------|----------------|
| No direct API calls from AI/business modules | All calls via `lib/connections/` adapters |
| No bypassing approvals | `connection-policy.ts` + skills governance |
| No credentials in frontend | `credential-store.ts` reads `process.env` only |
| No tokens in UI/logs | `secret-redaction.ts` on all responses |
| DRY_RUN default | `defaultConnectionMode()` returns `dry_run` |

## Production gates

Real execution requires ALL of:

1. `mode === "production"`
2. Governance approval granted
3. Risk engine allowed
4. Valid department permission
5. `FORGEOS_CONNECTIONS_PRODUCTION=true`
6. Explicit `userConfirmed: true`

RC5 additionally blocks `executeReal` at adapter level for safety.

## Lab restrictions

The `/lab/real-connections` UI only calls:

- `POST /api/connections/test`
- `POST /api/connections/dry-run`
- `POST /api/connections/request-approval`

No production execution endpoint is exposed to the lab.
