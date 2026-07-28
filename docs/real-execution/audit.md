# Audit Log

## Approach

All execution attempts are recorded in an in-memory audit log (`execution-audit.ts`).

## Recorded events

| Outcome | When |
|---------|------|
| `dry_run` | Dry-run plan generated |
| `approval_requested` | Approval session created |
| `approved` | Human approved session |
| `blocked` | Guard or policy blocked execution |
| `executed` | Real/sandbox execution completed |
| `failed` | Execution failed |

## Fields

- `requestId`, `capabilityId`, `provider`, `operation`
- `ventureId`, `requestedBy`, `approvedBy`
- `mode`, `outcome`, `riskLevel`
- `gatesSummary` — pass/fail per gate
- `details` — redacted output (max 2000 chars)

## Security

- Secrets redacted via `lib/connections/security/secret-redaction`
- No tokens in API responses
- Max 500 entries retained (FIFO)

## Access

- `getExecutionAuditLog(ventureId?)` — server-side only
- Lab UI shows timeline at `/lab/real-execution`
