# State Machine Audit — PROGRAM 6000

**Date:** 2026-07-24  
**Evidence:** Status types and transition helpers under `lib/` (mission-control, live-mission, runtime, preview, creation-output, domain).

---

## 1. Inventory of status systems

### Mission / Live / Autonomous

| Type | Values | File | Guarded transitions? |
|------|--------|------|----------------------|
| `MissionSessionStatus` | `DRAFT`, `UNDERSTANDING`, `PLANNING`, `BUILDING`, `VALIDATING`, `READY_FOR_DEPLOY`, `OPERATING`, `EVOLVING`, `PAUSED`, `BLOCKED`, `COMPLETED`, `FAILED` | `lib/mission-control/types.ts` | **No** — set via phase map / direct assign |
| `MissionStageStatus` | `pending`, `in_progress`, `completed`, `blocked`, `skipped` | same | No |
| `TaskStatus` (live) | `Queued`, `Running`, `Waiting`, `Completed`, `Failed` | `lib/mission-control/live-mission/types.ts` | **No** — `updateTaskStatus` |
| `LiveMissionVisibleState` | `QUEUED`, `RUNNING`, `WAITING`, `COMPLETED`, `FAILED`, `BLOCKED`, `PAUSED` | `lib/live-mission/types.ts` | Derived |
| `AutonomousStatus` | `idle`, `running`, `paused`, `awaiting_approval`, `completed` | `lib/mission-control/autonomous-build/types.ts` | Soft |

### Runtime

| Type | Values (abbrev.) | File | Guarded? |
|------|------------------|------|----------|
| `QueueTaskStatus` | `PENDING`…`DEAD_LETTER` | `lib/runtime/task-queue/task-status.ts` | **Yes** `canTransitionStatus` |
| Scheduler `TaskStatus` | lowercase `pending`…`cancelled` | `lib/runtime/scheduler/types.ts` + `task-status.ts` | **Yes** |
| `WorkerStatus` | `IDLE`…`DEPRECATED` | `lib/runtime/workers/worker-status.ts` | **Yes** |
| `ExecutionPipelineState` | `READY`…`DEAD_LETTER` | `lib/runtime/execution-engine/execution-status.ts` | **Yes** |
| `VentureState` | `IDEA`…`EXIT` + `PAUSED`/`BLOCKED`/`ARCHIVED` | `lib/runtime/state-machine/types.ts` | **Yes** |
| FOS venture FSM | `ideation`…`scaling` | `lib/fos/state-machine` | **Yes** |
| Domain `VentureStatus` | `intelligence` \| `building` \| `ready` | `lib/domain/venture.ts` | No |

### Build / Deploy / Output

| Type | Values (abbrev.) | File | Guarded? |
|------|------------------|------|----------|
| `PreviewDeploymentStatus` | `DRAFT`…`READY`/`FAILED`/`ROLLED_BACK`/`CANCELLED` | `lib/preview-deployment/types.ts` | **No** — any assign |
| `PreviewSandboxStatus` | `PENDING`…`EXPIRED` | `lib/preview-runtime/types.ts` | **Yes** sandbox-lifecycle |
| `CreationOutputStatus` | `DRAFT`…`DEPLOYMENT_READY`/`FAILED` | `lib/creation-output/types.ts` | Soft / UI can set |
| `ReleaseStatus` | `DRAFT`…`ROLLED_BACK` | release-manager | Soft (approval sets next) |
| Cloud `DeploymentStatus` | lowercase `pending`…`rolled_back` | `lib/cloud-foundation/types.ts` | Soft |

---

## 2. Synonyms

| Concept | Observed tokens |
|---------|-----------------|
| Done/success | `COMPLETED`, `Completed`, `completed`, `done`, `success`, `FINISHED`, deploy `READY` |
| Fail | `FAILED`, `Failed`, `failed`, `error`, `DEAD_LETTER` |
| In progress | `RUNNING`, `Running`, `running`, `in_progress`, `working`, `BUILDING`, `GENERATING` |
| Queue/wait | `PENDING`, `pending`, `QUEUED`, `Queued`, `WAITING`, `Waiting` |
| Ready family | `READY`, `READY_FOR_DEPLOY`, `READY_FOR_REVIEW`, `PREVIEW_READY`, `EXPORT_READY`, `DEPLOYMENT_READY`, `READY_WITH_PLAN` |
| Deployed | cloud `deployed`; preview terminal often `READY` (**no** `DEPLOYED` in PreviewDeploymentStatus) |

**Dialects:** Title Case (live tasks) vs SCREAMING_SNAKE (queue/mission session) vs lowercase (scheduler/domain).

---

## 3. Impossible / incoherent combinations (observed patterns)

| Issue | Evidence |
|-------|----------|
| Mission `PAUSED` while session phase status still from phase map | `mission-session.ts` can set `PAUSED` from autopilot while `state.sessionStatus` tracks phase |
| `awaiting_approval` mapped to visible `BLOCKED` | `lib/live-mission/mission-event-adapter.ts` — approval ≠ blocked elsewhere |
| Activity panel collapses Waiting/Queued | `MissionActivityPanel.tsx` remaps many → `QUEUED` |
| Venture domain `ready` ≠ mission `READY_FOR_DEPLOY` ≠ preview `READY` | Three unrelated enums |
| Execution `FINISHED` then `COMPLETED` | Pipeline mid-state vs terminal — easy to confuse in UI |

---

## 4. Ungoverned transitions

| Domain | Behavior |
|--------|----------|
| Mission session | Direct status/phase writes; no allow-list |
| Live mission tasks | Overwrite status |
| Preview deployment | `updateDeploymentStatus` accepts any status |
| Release approval | `transitionApprovalStatus(workflow, next)` without graph |
| Creation Output Studio UI | Can set `EXPORT_READY` in component |

**Governed:** runtime queue, scheduler, workers, execution pipeline, venture FSM, FOS FSM, preview sandbox.

---

## 5. UI-written state

| Location | Write |
|----------|-------|
| `app/actions/mission-control.ts` | Stub statuses `VALIDATING` / `BUILDING` / `DRAFT` |
| `components/creation-output-studio/StudioActionsPanel.tsx` | `EXPORT_READY` |
| `lib/live-mission/live-mission-store.ts` | Retry → `Queued`; autonomous `running` |
| `components/studio/BuildFlow.tsx` | Local legacy worker statuses |

---

## 6. Events without state / state without events

| Pattern | Evidence |
|---------|----------|
| Events without session status change | `emitMissionEvent` updates feeds/logs/progress only |
| Unmapped live events dropped | `adaptMissionEvent` returns `null` |
| State without bus event | Preview deploy status mutate; mission `setSessionPhase`; release approval helper |
| Synthetic events from state | `adaptTaskSnapshot` invents UI events from task status (not event-sourced) |
| Coupled | Venture FSM + execution/worker adapters publish Runtime events |

---

## 7. Mission / Task / Deployment mixing

```
MissionSessionStatus (SCREAMING, ungoverned)
    ├── Live MissionTask (Title Case) → LiveMissionVisibleState
    ├── AutonomousStatus (lowercase)
    └── PreviewDeploymentStatus (separate machine, ungoverned)
Runtime QueueTaskStatus (SCREAMING, governed)  ← not shared type with MissionTask
```

There is **no** single official cross-domain state machine today. Official machines exist **per runtime subsystem**; mission/deploy layers are largely free-form.

---

## Freeze implication

Until Program 6040 unifies models: **new state fields must attach to an existing official machine** (runtime queue/worker/execution/venture FSM, sandbox lifecycle, or explicitly documented MissionSessionStatus) — see [freeze-rules.md](./freeze-rules.md).
