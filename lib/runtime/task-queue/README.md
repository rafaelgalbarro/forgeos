# Task Queue (Epic 4.4)

Official task queue for ForgeOS Runtime. Flow:

**Event Bus → Scheduler → Task Queue → Worker Runtime → (Execution Engine) → Memory**

No worker executes tasks directly in this epic — queue planning, status, retries, and dead letter only.

## Modules

| File | Role |
|------|------|
| `task-queue.ts` | Main queue engine |
| `task-registry.ts` | create, find, filter, cancel, query, update, history |
| `queue-store.ts` | In-memory persistence |
| `task-status.ts` | Official states and transitions |
| `task-priority.ts` | P0–P3 with weight, timeout, maxRetries |
| `task-dependencies.ts` | Pipeline + scheduler dependency resolution |
| `retry-policy.ts` | NO_RETRY, LINEAR, EXPONENTIAL, MAX_3, MAX_5 |
| `dead-letter.ts` | Auto-move on max retries exceeded |
| `queue-metrics.ts` | Counts, latency, failures |
| `queue-telemetry.ts` | Event records and summaries |
| `scheduler-adapter.ts` | Plan scheduler tasks into queue |
| `worker-adapter.ts` | Query: has tasks? can execute? blocked? |
| `eventbus-adapter.ts` | Publish TASK_* events |

## Lab

`/lab/task-queue`
