# Venture State Machine (Epic 4.2)

Official venture lifecycle state machine for ForgeOS Runtime. Centralizes states, transitions, heuristic guards, in-memory history, Event Bus emission, and scheduler task recommendations.

**No worker execution. No Dashboard connection.**

## States

Linear pipeline: `IDEA` → `DISCOVERY` → `RESEARCH` → `PRODUCT` → `ARCHITECTURE` → `UX` → `BUILD` → `QA` → `LAUNCH` → `GROWTH` → `SCALE` → `CAPITAL` → `EXIT`

Special states: `PAUSED`, `BLOCKED`, `ARCHIVED`

- Any active state may transition to `PAUSED`, `BLOCKED`, or `ARCHIVED`
- `PAUSED` resumes to the previous active state
- `BLOCKED` resumes to the previous active state when `blockResolved` is true

## Usage

```typescript
import { createRuntimeEventBus } from "@/lib/runtime/event-bus/event-bus";
import { createVentureStateMachine } from "@/lib/runtime/state-machine/state-machine";

const bus = createRuntimeEventBus();
const machine = createVentureStateMachine({}, bus);

const guard = machine.canTransition("venture-1", "DISCOVERY", {
  ventureId: "venture-1",
  discoveryComplete: true,
});

const result = machine.transition({
  ventureId: "venture-1",
  to: "DISCOVERY",
  reason: "Discovery kickoff",
  triggeredBy: "lab",
  context: { ventureId: "venture-1", discoveryComplete: true },
});
```

## Guards (heuristic)

| Target | Requirement |
|--------|-------------|
| `RESEARCH` | Discovery has content |
| `PRODUCT` | Research complete |
| `BUILD` | Product PRD exists |
| `LAUNCH` | QA complete |
| `CAPITAL` | Minimum metrics met |

Guards return `{ allowed, reason, missingRequirements[], warnings[] }`.

## Event Bus

Emits on successful transitions:

- `VENTURE_STATE_CHANGED`
- `VENTURE_PAUSED` / `VENTURE_BLOCKED`
- `VENTURE_READY_FOR_BUILD` / `VENTURE_READY_FOR_LAUNCH` / `VENTURE_READY_FOR_CAPITAL`

## Scheduler recommendations

On transition, suggests tasks (no execution):

| From | Suggested task |
|------|----------------|
| `DISCOVERY` | `RESEARCH_RUN` |
| `RESEARCH` | `PRODUCT_UPDATE` |
| `PRODUCT` | `BUILD_PLAN_UPDATE` |
| `BUILD` | `QA_CHECK` (recommendation string) |
| `QA` | `LAUNCH_PREP` (recommendation string) |

## Lab

`/lab/state-machine` — interactive console with mock ventures, guard preview, history, events, and scheduler suggestions.

## Isolation

- Does not modify Dashboard, CEO Office, Research, Product, Build Engine, or AI Orchestration
- Direct imports from `event-bus/` and `scheduler/types` only
