# Current System Inventory — PROGRAM 6000

**Date:** 2026-07-24  
**Scope:** Evidence from the live ForgeOS codebase (`app/`, `components/`, `lib/`, `src/core/`).  
**Rule:** Runtime source of truth today is **`lib/*`**. `src/core/**` holds Architecture V2 stubs (Programs 6010+) and is **not** yet the productive spine.

Systems named in the program brief that are **not** top-level folders live under `lib/` (or `src/core/` stubs). There is **no** top-level `core/`, `runtime/`, `capabilities/`, `factories/`, `mission-control/`, etc.

---

## 1. Presentation (`app/`, `components/`)

| Field | Evidence |
|-------|----------|
| **Location** | `app/**` (164 `page.tsx` routes), `components/**` |
| **Purpose** | Next.js App Router UI; Mission Control, factories, labs, OS shell, auth |
| **Entities** | Consumes domain types; does not define canonical aggregates |
| **Inputs** | User actions, server actions (`app/actions/*`), lib loaders/snapshots |
| **Outputs** | Rendered pages, client mutations via lib APIs |
| **Dependencies** | Heavy `@/lib/*`; some direct `*-engine` imports (see dependency-map) |
| **Persistence** | Mostly via lib; some components write `localStorage` (factory dashboards) |
| **Events** | UI listeners / `useSyncExternalStore`; Live Mission UI events |
| **Consumers** | End users / founders |
| **State** | React local + lib stores |
| **Duplications** | Product vs `/lab/*` twins; `/venture/[id]` vs `/ventures/[slug]` |
| **Migration risk** | **High** — largest surface; must consolidate experience without breaking routes |

---

## 2. Mission Control (`lib/mission-control/`)

| Field | Evidence |
|-------|----------|
| **Location** | `lib/mission-control/**` (+ `components/mission-control/`, `app/mission-control/`) |
| **Purpose** | PROGRAM 5100/5150/5300 coordinator: conversation, intention, session, decisions, live execution bridges |
| **Entities** | `Mission`, `MissionSession`, `MissionIntent`, `MissionState`, `MissionArtifact`, `MissionDecision`, `MissionEvent` (coarse) — `lib/mission-control/types.ts` |
| **Inputs** | Founder messages, decisions, factory/studio adapters |
| **Outputs** | Mission session snapshots, history, live mission state, router to factories/studio |
| **Dependencies** | `live-mission` (nested + `lib/live-mission`), pair-founder, multi-output, creation-output adapters, factories |
| **Persistence** | `forgeos-mission-control-missions`, `-active`, decision logs, autonomous checkpoints (`mission-persistence.ts`, `mission-repository.ts`) |
| **Events** | Coarse `MissionEvent` + `emitMissionEvent` (live) |
| **Consumers** | `/mission-control`, studio, multi-output, pair-founder |
| **State** | `MissionSessionStatus` (DRAFT…FAILED); phase map in `mission-runner.ts` |
| **Duplications** | Dual `MissionEvent`; UI `Mission` vs persistence `MissionSession`; cycle with `lib/live-mission` |
| **Migration risk** | **Critical** — product spine; freeze before Kernel V2 |

---

## 3. Live Mission (`lib/live-mission/` + nested)

| Field | Evidence |
|-------|----------|
| **Location** | `lib/live-mission/**` (PROGRAM 5300 UI snapshot/store); legacy primitives `lib/mission-control/live-mission/**` |
| **Purpose** | Real-time activity feed, task views, serializable snapshots for UI |
| **Entities** | `LiveMissionUIEvent`, `LiveMissionTaskView`, nested `MissionTask`, rich `MissionEvent` |
| **Inputs** | Mission emitter, persistence, adapters |
| **Outputs** | UI snapshots, visible state (`QUEUED`…`FAILED`) |
| **Dependencies** | Imports `@/lib/mission-control/*` (cycle) |
| **Persistence** | Via mission persistence; client store with `"use client"` + React hooks |
| **Events** | Live mission emitter + UI adapter (synthetic events from task status) |
| **Consumers** | Mission Activity panels, `/lab/live-mission` |
| **State** | Title-Case task status vs SCREAMING visible state |
| **Duplications** | Nested vs top-level live-mission packages |
| **Migration risk** | **High** — React inside `lib/`; package split required carefully |

---

## 4. Factories

| Field | Evidence |
|-------|----------|
| **Location** | `lib/website-factory/`, `lib/mobile-factory/`, `lib/application-factory/`, `lib/venture-factory/`, `lib/build-platform/*-factory/` |
| **Purpose** | Product generation pipelines + blueprint factories (frontend/backend/qa/database/infrastructure) |
| **Entities** | `WebsiteProject`, `MobileProject`, `AppProject`, `CodeProject`-adjacent outputs; JobSpec (blueprint only) |
| **Inputs** | Idea/venture/mission context, Build DNA/Context |
| **Outputs** | Project artifacts, pipeline status, dashboards |
| **Dependencies** | Build platform, persistence bridges, AI types |
| **Persistence** | Direct `localStorage` in website/mobile/application `pipeline.ts` |
| **Events** | Mostly local / not Runtime bus |
| **Consumers** | `/website-factory`, `/mobile-factory`, `/application-factory`, lab twins |
| **State** | Factory-local `BuildStatus` dialects |
| **Duplications** | Product route vs `/lab/*-factory` UIs |
| **Migration risk** | **Medium–High** — persistence bypasses `lib/persistence` |

---

## 5. AI Runtime / Providers / Skills / Capabilities

| Field | Evidence |
|-------|----------|
| **Location** | `lib/ai-runtime/`, `lib/ai/providers/`, `lib/ai-orchestration/`, `lib/skills/**`, `lib/capabilities/` |
| **Purpose** | Model routing, context, telemetry; skill modules; capability registry/planner (RC4.9) |
| **Entities** | Capability requests/policies; provider clients; skill registries |
| **Inputs** | Capability/skill invocations, AI prompts |
| **Outputs** | Model responses, capability plans, telemetry |
| **Dependencies** | Providers (OpenAI/Anthropic/stub), connections |
| **Persistence** | Capability events `forgeos-capability-events`; skill store telemetry |
| **Events** | Capability/governance append-only logs (not Runtime bus) |
| **Consumers** | Labs (`/lab/ai-runtime`, `/lab/capabilities`, skills labs); orchestration adapters |
| **State** | Telemetry + policy state |
| **Duplications** | Multiple AI entry points (`ai`, `ai-runtime`, `ai-gateway`, `ai-orchestration`) |
| **Migration risk** | **Medium** — keep behind adapters; presentation must not import providers |

---

## 6. Runtime Kernel (`lib/runtime/`)

| Field | Evidence |
|-------|----------|
| **Location** | `lib/runtime/{event-bus,scheduler,task-queue,workers,execution-engine,state-machine,observability}` |
| **Purpose** | Operational kernel: events, tasks, workers, execution pipelines, venture FSM |
| **Entities** | `RuntimeEvent`, `SchedulerTask`, `QueueTask`, workers, `VentureState` |
| **Inputs** | Event bus publishes; scheduler ingest |
| **Outputs** | Task/worker/execution lifecycle; venture transitions |
| **Dependencies** | Internal adapters; AI orchestration adapter |
| **Persistence** | Mostly **in-memory** Maps; tasks also `forgeos-persist-tasks` via persistence repos |
| **Events** | Runtime Event Bus (42 typed events) |
| **Consumers** | Labs (`/lab/task-queue`, `/lab/workers`, `/lab/execution-engine`, `/lab/state-machine`), bridges |
| **State** | Formal `ALLOWED_TRANSITIONS` for queue/workers/execution/venture FSM |
| **Duplications** | Parallel FOS bus; scheduler vs queue task status dialects |
| **Migration risk** | **High** — Kernel V2 must wrap, not replace blindly |

---

## 7. Build / Code / Preview / Deployment / Multi-output

| System | Location | Purpose (evidence) | Persistence | Migration risk |
|--------|----------|-------------------|-------------|----------------|
| **Build platform** | `lib/build-platform/**` | BuildContext, BuildDNA, release-manager, factories | Persist keys for context/DNA | Medium |
| **Build engine** | `lib/build-engine/**` | CEO build queue / artifacts | In-memory / UI | Medium |
| **Code generation** | `lib/code-generation/**` | PROGRAM 5360 project files + ZIP | Memory `Map` (+ optional LS helpers) | Medium |
| **Creation output** | `lib/creation-output/**` | PROGRAM 5350 deliverable contract | `forgeos-creation-outputs-v5350` | High (studio spine) |
| **Preview runtime** | `lib/preview-runtime/**` | PROGRAM 5370 sandbox | FS writes in sandbox-runner; sandbox status FSM | Medium |
| **Preview deployment** | `lib/preview-deployment/**` | PROGRAM 5380 one-click preview deploy | Request history / approvals | Medium |
| **Multi-output** | `lib/multi-output/**` | PROGRAM 5390 plan/sync across outputs | Soft cycle with creation-output | Medium |
| **Real build flow** | `lib/real-build-flow/**` | Step pipeline for real build | Step statuses | Medium |

---

## 8. Persistence (`lib/persistence/`)

| Field | Evidence |
|-------|----------|
| **Location** | `lib/persistence/**` (Program 3000) |
| **Purpose** | Adapter + repository layer (`local` default; supabase/postgres stubs) |
| **Entities** | Aliases: `PersistedVenture = VentureProject`, tasks, workspaces, decisions, build context/DNA, … |
| **Inputs** | Repository APIs |
| **Outputs** | KV via localStorage + IndexedDB overflow (`local-adapter.ts`) |
| **Dependencies** | Domain types from lib; optional Supabase REST stub |
| **Persistence** | `PERSISTENCE_KEYS` in `types.ts`; snapshots max 10 |
| **Events** | Sync status only |
| **Consumers** | Bridges (venture/workspace/auth/intelligence), repos |
| **State** | `SyncStatus` |
| **Duplications** | Many domains still use private `forgeos-*` keys outside this package |
| **Migration risk** | **High** — unify SoT without dual-write corruption |

---

## 9. Domain stubs / V2 contracts (`src/core/domain/`, `lib/domain/`)

| Field | Evidence |
|-------|----------|
| **Location** | `lib/domain/*` (runtime types e.g. `VentureProject`); `src/core/domain/**` (6010+ stubs/entities) |
| **Purpose** | Legacy fat models vs emerging branded aggregates |
| **Entities** | See domain-duplication-map |
| **Inputs/Outputs** | Mapping intended via adapters (not fully wired as SoT) |
| **Dependencies** | Domain README: no React/Next (enforced in stubs today) |
| **Persistence** | Not productive SoT |
| **Events** | `DomainEvent` / envelope stubs under `src/core/domain` |
| **Consumers** | Application/orchestration stubs when present |
| **Duplications** | Parallel Workspace/Venture/Mission definitions |
| **Migration risk** | **Critical** if treated as SoT prematurely |

---

## 10. Supporting platforms (brief)

| System | Location | Notes | Risk |
|--------|----------|-------|------|
| Command Center | `lib/command-center/`, `/command-center` | Legacy founder hub (sidebar `legacy`) | Medium |
| FOS | `lib/fos/**` | Separate event bus + lifecycle FSM | Medium |
| Intelligence layer | `lib/intelligence-layer/**` | Canonical persisted `Decision` | Medium |
| Workspace / Auth | `lib/workspace/`, `lib/auth/` | Workspaces, orgs, users | High |
| Portfolio / Dashboard / CEO | `lib/portfolio`, `lib/dashboard`, `lib/ceo*` | Projections | Low–Medium |
| Commercial / Enterprise / Cloud | `lib/commercial`, `lib/enterprise`, `lib/cloud-foundation` | Separate storage key namespaces | Medium |
| Labs registry | `app/lab/*`, `app/labs` | 52 lab pages | Low (harnesses) |

---

## Inventory summary

| Tier | Systems |
|------|---------|
| **Product spine** | Home → Mission Control → Studio (creation-output/code/preview) → Factories → Deployments |
| **Operational spine** | Runtime event-bus / scheduler / queue / workers / execution / venture FSM |
| **Data spine** | Persistence package + many parallel localStorage SoTs |
| **Emerging V2** | `src/core/domain/**` stubs — **not** declared productive |
| **Lab / Legacy** | `/lab/*`, Command Center, Founder, Dashboard, Creator banners |

**PROGRAM 6000 does not migrate these systems.** Freeze contracts first; migrate via later programs (6010–6080).
