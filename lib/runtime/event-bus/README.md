# Runtime Event Bus (Epic 4.0)

Typed pub/sub for the ForgeOS Runtime kernel. In-memory history; no Dashboard wiring.

## Location

`lib/runtime/event-bus/`

## Capabilities

- **Publish** typed events with category metadata
- **Subscribe** per event type or all events
- **Unsubscribe** handlers explicitly
- **History** — in-memory ring buffer (default 500 events)
- **Registry** — canonical list of event types and categories
- **Validation** — payload shape checks on publish

## Categories

| Category | Events |
|----------|--------|
| venture | `VENTURE_CREATED`, `DISCOVERY_COMPLETED`, `RESEARCH_COMPLETED`, `VENTURE_APPROVED` |
| ceo | `CEO_DECISION_CREATED` |
| board | `BOARD_CONSENSUS_REACHED` |
| build | `BUILD_REQUESTED`, `BUILD_COMPLETED` |
| memory | `MEMORY_UPDATED` |
| capital | `RISK_DETECTED`, `OPPORTUNITY_DETECTED` |

## Usage

```typescript
import { createRuntimeEventBus } from "@/lib/runtime/event-bus";

const bus = createRuntimeEventBus();

const off = bus.subscribe("VENTURE_CREATED", (event) => {
  console.log(event.payload.name);
});

bus.publish({
  type: "VENTURE_CREATED",
  source: "venture-registry",
  payload: { ventureId: "v1", name: "Acme SaaS" },
});

off();
```

## Isolation

- Not connected to `/dashboard` or FOS (`lib/fos/event-bus/`).
- Consumed by future runtime epics (Scheduler 4.1, Execution Engine 4.5).

## Files

| File | Role |
|------|------|
| `types.ts` | Event types, payloads, bus interface |
| `registry.ts` | Event definitions and category lookup |
| `event-bus.ts` | Engine implementation |
| `validator.ts` | Publish payload validation |
| `index.ts` | Minimal public exports |

## Validation

Run registry coverage check:

```typescript
import { validateRegistryCoverage } from "@/lib/runtime/event-bus";
validateRegistryCoverage(); // { valid: true, errors: [] }
```
