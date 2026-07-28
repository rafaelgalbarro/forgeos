# Approval Flow

## Mandatory 9-step pipeline

1. **Select capability** — choose from allowed real connection capabilities
2. **Generate dry-run** — via `lib/connections/` adapters
3. **Calculate risk** — via `lib/skills-governance/risk-engine`
4. **Show required permissions** — via permission engine
5. **Request human approval** — creates `ApprovalSession` (status: `pending`)
6. **Human approves/rejects** — `approveSession` / `rejectSession`
7. **Execute** — only if ALL gates pass (see execution-guard)
8. **Register audit log** — every attempt logged
9. **Return rollback plan** — from connection plan rollback steps

## Approval session lifecycle

```
pending → approved → execution allowed
pending → rejected → execution blocked
pending → expired  → execution blocked (30 min TTL)
```

## Environment variables

- `REAL_EXECUTION_REQUIRE_APPROVAL=true` — sessions start as `pending`
- When `false`, sessions auto-approve (not recommended for production)

## API usage

```text
POST /api/real-execution/dry-run
POST /api/real-execution/request-approval  → returns session.id
POST /api/real-execution/approve           → { sessionId, approvedBy }
POST /api/real-execution/execute         → { approvalSessionId, ... }
```

Execution is blocked without an approved session when approval is required.
