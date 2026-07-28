# Runtime Scheduler (Epic 4.1)

Central scheduler for the ForgeOS Runtime kernel. Plans tasks, assigns priorities, resolves dependencies, and generates execution plans from Event Bus signals. **Does not execute workers.**

## Location

`lib/runtime/scheduler/`

## Capabilities

- **Subscribe** to Runtime Event Bus events and convert them to tasks
- **Prioritize** tasks using P0–P3 heuristics
- **Resolve** dependency graphs per venture
- **Transition** task status (pending → ready/blocked → …)
- **Plan** ordered execution waves (calculate only)

## Task types

`DISCOVERY_REVIEW`, `RESEARCH_RUN`, `PRODUCT_UPDATE`, `CEO_REVIEW`, `BOARD_REVIEW`, `SIMULATOR_UPDATE`, `BUILD_PLAN_UPDATE`, `MEMORY_WRITE`, `RISK_REVIEW`, `OPPORTUNITY_REVIEW`

## Event → task mapping

| Event | Tasks created |
|-------|----------------|
| `VENTURE_CREATED` | `DISCOVERY_REVIEW` |
| `DISCOVERY_COMPLETED` | completes `DISCOVERY_REVIEW`, creates `RESEARCH_RUN` |
| `RESEARCH_COMPLETED` | completes `RESEARCH_RUN`, creates `PRODUCT_UPDATE`, `SIMULATOR_UPDATE` |
| `CEO_DECISION_CREATED` | `CEO_REVIEW` |
| `BOARD_CONSENSUS_REACHED` | completes `BOARD_REVIEW`, creates `BOARD_REVIEW`, `BUILD_PLAN_UPDATE` |
| `RISK_DETECTED` | `RISK_REVIEW` |
| `OPPORTUNITY_DETECTED` | `OPPORTUNITY_REVIEW` |
| `MEMORY_UPDATED` | `MEMORY_WRITE` |

## Priority heuristics

| Signal | Priority |
|--------|----------|
| Critical risk / blocked venture | P0 |
| Pending decision / incomplete research | P1 |
| Incomplete product / pending memory | P2 |
| General improvements | P3 |

## Dependencies (calculate only)

- `PRODUCT_UPDATE` → `RESEARCH_RUN`
- `BUILD_PLAN_UPDATE` → `PRODUCT_UPDATE`
- `BOARD_REVIEW` → `CEO_REVIEW`
- `SIMULATOR_UPDATE` → `PRODUCT_UPDATE`
- BUILD (future) → `BOARD_REVIEW` + `BUILD_PLAN_UPDATE`

## Usage

```typescript
import { createRuntimeEventBus } from "@/lib/runtime/event-bus/event-bus";
import {
  createRuntimeScheduler,
  connectSchedulerToEventBus,
} from "@/lib/runtime/scheduler/scheduler";

const bus = createRuntimeEventBus();
const scheduler = connectSchedulerToEventBus(createRuntimeScheduler(), bus);

bus.publish({
  type: "VENTURE_CREATED",
  source: "lab",
  payload: { ventureId: "v1", name: "Acme" },
});

const plan = scheduler.getExecutionPlan("v1");
```

## Lab

Interactive console: `/lab/runtime-scheduler`

## Isolation

- No Dashboard, CEO Office, or worker execution wiring
- Direct imports from `lib/runtime/event-bus/` (no heavy barrels)
- Consumed by future Execution Engine (Epic 4.5)

## Files

| File | Role |
|------|------|
| `types.ts` | Task, priority, plan contracts |
| `priority.ts` | P0–P3 heuristics |
| `task-status.ts` | Status transitions |
| `dependencies.ts` | Dependency graph |
| `scheduler-store.ts` | In-memory store |
| `task-planner.ts` | Execution plan generation |
| `scheduler.ts` | Engine + Event Bus wiring |
| `index.ts` | Minimal exports |
