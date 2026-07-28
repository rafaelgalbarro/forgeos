# Event Mapping — PROGRAM 5300

Transforms real system events into canonical UI events. **Never invents events.**

## Canonical UI events

| UI Event | Source |
|----------|--------|
| `mission_created` | `intention_classified` (event-emitter) |
| `stage_started` | `phase_advance`, history "iniciada" |
| `department_started` | `worker_start`, `discovery` |
| `task_queued` | `queue_updated`, task status Queued |
| `task_running` | `execution`, `task_progress`, task status Running |
| `artifact_created` | `deploy_stub`, `gtm`, completed snapshots |
| `decision_requested` | `decision_resolved`, unresolved `pendingDecisions` |
| `approval_required` | `approval_required`, `autonomous.pendingApproval` |
| `task_completed` | `task_complete`, `worker_complete`, task status Completed |
| `task_failed` | `risk_detected`, task status Failed |
| `stage_completed` | `factory_step`, `checkpoint_saved`, history "completad" |
| `mission_paused` | `autonomous_paused`, autonomous status paused |
| `mission_resumed` | `autonomous_resumed`, autonomous status running |

## Source systems

### event-emitter.ts (mission-control/live-mission)

Primary event bus. `registerMissionEventListener` feeds the adapter via `wireMissionEventAdapter`.

### mission-history.ts (5150)

Append-only history. `readMissionHistory` → `adaptHistoryEntry` for stage/artifact events.

### mission-runner.ts (5150)

Stage advances write history entries; timeline + event-emitter propagate to UI.

### autonomous-build

Worker ticks, approval gates, pause/resume emit through `emitAutonomousMissionEvent`.

## Visible states

| State | Derivation |
|-------|------------|
| `QUEUED` | Task status Queued |
| `RUNNING` | Task Running, liveExecution.active, autonomous running |
| `WAITING` | Task Waiting, department waiting |
| `COMPLETED` | Task Completed (only after real completion event) |
| `FAILED` | Task Failed, risk_detected |
| `BLOCKED` | awaiting_approval, important unresolved decisions |
| `PAUSED` | autonomous_paused, pausedByUser |
