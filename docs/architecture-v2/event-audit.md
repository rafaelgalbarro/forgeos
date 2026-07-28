# Event Audit — PROGRAM 6000

**Date:** 2026-07-24  
**Finding:** Multiple parallel event systems coexist. There is **no** single event spine. Catalogs are **unversioned**.

---

## 1. Event systems inventory

| System | Path | Pattern | Versioned? |
|--------|------|---------|------------|
| **Runtime Event Bus** | `lib/runtime/event-bus/` | `publish` / `subscribe` / `subscribeAll`; shared singleton | **No** schema version on envelope |
| **FOS Event Bus** | `lib/fos/event-bus/` | Separate `fos:*` namespace | No |
| **Platform Event Bus** | `lib/platform/shared/events.ts` | Stub — comment: not wired to app runtime | No |
| **Live Mission emitter** | `lib/mission-control/live-mission/event-emitter.ts` | `emitMissionEvent` + listener Sets; mutates mission | No |
| **Live Mission UI** | `lib/live-mission/*` | Adapter + poll (~2s) + UI event types | No |
| **Queue lifecycle** | `lib/runtime/task-queue/queue-events.ts` | Internal emitter | No |
| **Append-only logs** | capabilities, skills-governance, intelligence history, beta analytics | localStorage / memory | No |
| **UI store notify** | CEO workspace/office hooks | `emit()` for React invalidation | N/A (not domain) |

`app/` has no EventBus publish/subscribe matches.

---

## 2. Runtime Event Bus (operational catalog)

**Envelope:** `{ id, type, category, timestamp, source, payload }` — `lib/runtime/event-bus/types.ts`

**Categories:** `venture | ceo | board | build | memory | capital | worker | task | execution`

**Types (42):** includes `VENTURE_*`, `BUILD_REQUESTED/COMPLETED`, `WORKER_*`, `TASK_*`, `EXECUTION_*`, `SESSION_*`, risk/opportunity/memory, board/CEO.

**Payloads:** typed via `RuntimeEventPayloadMap` in same file.

**Producers:** workers/task-queue/execution-engine `eventbus-adapter.ts`, `state-events.ts`.

**Hidden side-effect listener:** `connectSchedulerToEventBus` (`lib/runtime/scheduler/scheduler.ts`) subscribes to venture/CEO/board/risk/opportunity/memory events and **auto-creates scheduler tasks**. Wired from `execution-context.ts`.

---

## 3. Mission / Live Mission / Deployment feeds

| Kind | Evidence |
|------|----------|
| Coarse `MissionEvent` | `type: "stage"\|"decision"\|"artifact"\|"score"\|"system"\|"conversation"` — session types |
| Rich `MissionEvent` | 25+ strings (`user_message`, `worker_start`, `deploy_stub`, …) — **same name, incompatible** |
| Emitter side effects | Append events (cap 100), research/build/deployment feeds, logs, department activity, progress |
| Deployment | Feed entries + `deploy_stub` / `approval_required` — **not** Runtime bus |
| UI-only | `LiveMissionUIEventType`; synthetic events from task snapshots |

---

## 4. Build / Domain / Telemetry

| Kind | Notes |
|------|-------|
| Runtime `BUILD_*` | Real bus events |
| Backend-factory `event-generator.ts` | **Codegen specs** for customer apps — not live bus |
| Code-generation writes `domain.events.ts` into generated projects | Artifact only |
| Telemetry | `lib/ai-runtime/telemetry`, capability/worker/execution telemetry — **not** domain events |
| Launch analytics | `console.log` only |
| Governance/capability events | Separate localStorage append logs |

---

## 5. FOS / Platform

| Bus | Events (sample) | Side effects |
|-----|-----------------|--------------|
| FOS | `fos:boot`, `fos:metrics:computed`, `fos:lifecycle:transition`, … | Bridges cache last payload (`health`, `live`, `portfolio` fos-bridge) |
| Platform | `pillar.*`, `venture.context_updated`, `adapter.invoked` | Stub only |

---

## 6. Detected problems

| Issue | Evidence |
|-------|----------|
| **Duplicate names** | Two `MissionEvent` types; Runtime `TASK_COMPLETED` vs live `task_complete` vs UI `task_completed` |
| **Unversioned events** | No schemaVersion on Runtime/FOS/Live envelopes (worker payload `version` ≠ event version) |
| **Incompatible payloads** | Coarse vs rich mission events share a name |
| **Hidden listeners** | Scheduler ingest; FOS bridges mutate module caches |
| **UI-only events** | LiveMission UI types; CEO `emit()`; DOM listeners |
| **State without events** | Preview deploy status, mission phase sets, release approval helper |
| **Events without state** | Many live mission emits don't change `MissionSessionStatus` |

---

## 7. Freeze implication

- **Do not create a new Event Bus** (freeze-rules). Program 6040 must adapt/wrap existing Runtime bus.
- Do not promote telemetry or UI notify channels to domain events.
- New cross-cutting domain signals should go through Runtime bus **or** an approved V2 envelope adapter — not a third bus.
