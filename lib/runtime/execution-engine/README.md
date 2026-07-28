# ForgeOS Execution Engine (Epic 4.5)

Central execution engine completing the Runtime Kernel RC1.

## Flow

```
Event Bus → Scheduler → Task Queue → Execution Engine → Worker Runtime
  → (mock AI Orchestration) → Memory → Decision Graph → Telemetry
```

## Pipeline states

`READY` → `DISPATCHED` → `VALIDATED` → `RUNNING` → `FINISHED` → `COMPLETED`

On failure: `FAILED` → `RETRY` → `DEAD_LETTER`

## Lab

`/lab/execution-engine` — Run Mock Runtime traverses the full pipeline.

## Adapters

| Adapter | Role |
|---------|------|
| `scheduler-adapter.ts` | Consult scheduler, plan tasks into queue |
| `queue-adapter.ts` | Select READY task, update task status |
| `worker-adapter.ts` | Execute worker via worker-runner |
| `eventbus-adapter.ts` | Publish EXECUTION_* / SESSION_* events |
| `memory-adapter.ts` | In-memory execution memory writes |
| `decision-graph-adapter.ts` | In-memory decision graph writes |
| `ai-orchestration-adapter.ts` | Mock AI calls only — no real automatic AI |

## Future adapters (stubs)

AI Runtime, Build Engine, Marketing, Finance, Legal, Capital — Coming Soon.

## Constraints

- No Dashboard dependency
- Mock only — no real automatic AI
- Direct imports from sibling runtime modules
