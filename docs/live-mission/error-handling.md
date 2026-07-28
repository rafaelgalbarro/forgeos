# Error Handling — PROGRAM 5300

## Task failure

When a task fails (`markTaskFailed`, `failTaskControlled`, or autonomous worker error):

1. Task status → `Failed` (visible state `FAILED`)
2. Error logged in `liveMission.logs` (level `error`)
3. `task_failed` UI event emitted via adapter (`risk_detected` → `task_failed`)
4. Warning shown in Mission Activity → Errors & Warnings panel
5. Mission continues — other tasks unaffected

## Retry

`retryFailedTask(missionId, taskId)`:

1. Resets failed task to `Queued` with progress 0
2. Emits `queue_updated` event
3. Re-syncs live mission state
4. Persists to localStorage
5. UI shows **Reintentar** button on failed tasks

## Controlled failure (lab / test)

`failTaskControlled(missionId, taskId, reason)` for NEXORA FIELD verification:

- Fails a running task with explicit reason
- Does not break mission or conversation
- Retry restores queue flow

## Warnings vs errors

| Level | Source |
|-------|--------|
| `warn` | `risk_detected`, `mission.status.risks`, log level warn |
| `error` | Failed tasks, log level error |

## UI surfaces

- **MissionActivityPanel** — Errors & Warnings section + per-task retry
- **LiveMissionTimeline** — `task_failed` events with ⛔ icon
- **Lab** — Controlled fail + retry buttons

## Rules

- Never mark `COMPLETED` without a real completion event
- Never crash Mission Control on task failure
- CEO conversation remains enabled during error states
