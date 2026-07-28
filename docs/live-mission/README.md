# PROGRAM 5300 — Live Mission

Real-time mission visibility in ForgeOS without blocking conversation or loading heavy engines in the browser.

## Objective

Show how ForgeOS works in live during Mission Control: task queue, department activity, artifact feed, timeline, errors — while the CEO conversation stays interactive.

## Architecture

```
Existing systems (no duplication)
  Event Bus / Scheduler / Task Queue / Worker Runtime / Execution Engine
  Observability / Mission Control / Mission History / Mission Runner (5150)
                    │
                    ▼
         mission-event-adapter.ts  →  UI events (canonical)
                    │
                    ▼
         live-mission-snapshot.ts  →  serializable snapshot
                    │
                    ▼
         live-mission-store.ts      →  polling + subscriptions
                    │
        ┌───────────┴───────────┐
        ▼                       ▼
 MissionActivityPanel      LiveMissionTimeline
 LiveExecutionBar          /lab/live-mission
```

## Module layout

| Path | Role |
|------|------|
| `lib/live-mission/` | Canonical PROGRAM 5300 coordinator |
| `lib/mission-control/live-mission/` | Legacy primitives + bridge re-exports |

## Rules

1. **No invented events** — adapter only transforms real events from existing systems
2. **No parallel runtime** — reuse Event Bus, Task Queue, Observability
3. **No heavy client imports** — client receives snapshots + light polling only
4. **Non-blocking conversation** — CEO input enabled during department work
5. **Never show COMPLETED without real event** — state derived from actual task/event data

## Routes

| Route | Purpose |
|-------|---------|
| `/mission-control` | Main Mission Control with live panels |
| `/mission-control/[missionId]` | Persisted mission detail |
| `/missions/[missionId]` | Alias → mission-control detail |
| `/lab/live-mission` | NEXORA FIELD verification lab |

## Related docs

- [event-mapping.md](./event-mapping.md)
- [snapshot.md](./snapshot.md)
- [realtime-strategy.md](./realtime-strategy.md)
- [error-handling.md](./error-handling.md)
