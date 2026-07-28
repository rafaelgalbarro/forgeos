# Realtime Strategy — PROGRAM 5300

## Approach: light polling + event bus subscriptions

No WebSockets (not present in codebase). No duplicate observability stack.

### 1. Event bus (primary)

`wireMissionEventAdapter` subscribes to `registerMissionEventListener` from mission-control event-emitter. Real events are transformed and pushed to UI event listeners immediately.

### 2. Store polling (secondary)

`useLiveMissionSnapshot` polls `getMissionById` every 2s (configurable) and rebuilds snapshot from persisted mission data. Ensures UI stays in sync when events originate outside the listener (e.g. autonomous tick loop, queue timer).

### 3. React state (Mission Control shell)

Existing intervals in `MissionControlShell.tsx`:

- `execTimer` — live execution step advance (2.5s)
- `autoTimer` — autonomous build tick (2s)
- `queueTimer` — live mission queue advance (3s)

These update mission state → store polling picks up changes.

## Non-blocking conversation

- CEO `Input` is never disabled during background work
- Only the Send button disables briefly during `processConversationTurn`
- Long jobs run via autonomous loop / queue timers asynchronously

## Performance constraints

Client bundle must NOT include:

- Execution Engine
- Scheduler
- AI Runtime
- Full factory modules

Client imports only:

- `@/lib/live-mission/*` (snapshot, store, selectors)
- `@/lib/mission-control/live-mission/types` (types only)
- `@/lib/mission-control/mission-persistence` (localStorage read)

## Lab verification

`/lab/live-mission` exercises NEXORA FIELD flow with snapshot JSON preview and step controls.
