# ForgeOS Worker Runtime (Epic 4.3)

Official department execution units governed by:

**Event Bus → Scheduler → State Machine → Worker Runtime → (future AI Orchestration) → Memory**

## Scope

- 20 official workers with capabilities, allowed venture states, and supported tasks
- In-memory registry with query/filter
- Mock runner (no real AI execution)
- Adapters for Event Bus, Scheduler, and State Machine
- Health, metrics, and telemetry
- Task Queue adapter **stub** (Epic 4.4)

## Lab

`/lab/workers` — inspect workers and run mock execution through the full runtime chain.

## Key modules

| Module | Role |
|--------|------|
| `worker-factory.ts` | Official worker definitions |
| `worker-registry.ts` | Register, find, filter, query |
| `worker-runner.ts` | Validate + mock execute |
| `scheduler-adapter.ts` | Who can execute? priority? deps? |
| `state-machine-adapter.ts` | Allowed venture states per worker |
| `eventbus-adapter.ts` | Publish worker lifecycle events |
| `queue-adapter.ts` | Stub for Epic 4.4 |

## Worker events (Event Bus)

`WORKER_REGISTERED`, `WORKER_STARTED`, `WORKER_COMPLETED`, `WORKER_FAILED`, `WORKER_BLOCKED`, `WORKER_PAUSED`, `WORKER_RESUMED`, `WORKER_HEALTH_CHANGED`

## Next

Epic 4.4 — Task Queue (`lib/runtime/task-queue/`)
