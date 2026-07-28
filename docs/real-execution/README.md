# ForgeOS Real Execution Approval Layer (RC5.1)

Controlled first real skill executions with mandatory human approval, prior dry-run, audit log, and rollback plan.

## Overview

RC5.1 builds on RC5 Real Connections and RC4.1 Skills Governance to enable **non-destructive** real executions only when all gates pass.

## Default behavior

- `ENABLE_REAL_EXECUTION=false` → dry-run and sandbox only
- Human approval required (`REAL_EXECUTION_REQUIRE_APPROVAL=true`)
- No credentials exposed to frontend
- Server-side execution via `lib/connections/` adapters

## Modules

| Module | Purpose |
|--------|---------|
| `types.ts` | Core types |
| `approval-session.ts` | Human approval sessions |
| `execution-request.ts` | Build requests from capability + dry-run |
| `execution-policy.ts` | Gates, allowed/forbidden actions |
| `execution-guard.ts` | Pre-flight checks |
| `execution-runner.ts` | 9-step orchestration |
| `execution-audit.ts` | Audit log |
| `rollback-validator.ts` | Rollback plan validation |

## API routes

- `POST /api/real-execution/dry-run`
- `POST /api/real-execution/request-approval`
- `POST /api/real-execution/approve`
- `POST /api/real-execution/execute`

## Lab

`/lab/real-execution` — interactive 9-step flow.

## See also

- [approval-flow.md](./approval-flow.md)
- [allowed-actions.md](./allowed-actions.md)
- [forbidden-actions.md](./forbidden-actions.md)
- [audit.md](./audit.md)
- [rollback.md](./rollback.md)
- [security.md](./security.md)
