# Rollback

## Plan structure

Every `ConnectionPlan` includes:

- `steps` — forward execution steps
- `rollbackSteps` — reverse operations for reversible steps

## Per-provider rollback

| Provider | Rollback action |
|----------|----------------|
| GitHub | Delete repo/branch, close PR |
| Supabase | Revert migration |
| Vercel | Rollback deployment |
| Cloudflare | Revert DNS records |

## RC5 behavior

Rollback plans are generated and displayed in the lab. Actual rollback execution follows the same production gates as forward execution and is blocked by default.

## Audit

All rollback attempts are logged via `connection-audit.ts` with redacted details.
