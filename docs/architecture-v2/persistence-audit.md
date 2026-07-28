# Persistence Audit — PROGRAM 6000

**Date:** 2026-07-24  
**Default provider:** `local` (`lib/persistence/config.ts` via `NEXT_PUBLIC_PERSISTENCE_PROVIDER` / `PERSISTENCE_PROVIDER`).

---

## 1. Mechanisms found

| Mechanism | Present? | Evidence |
|-----------|----------|----------|
| **localStorage** | **Yes — primary SoT** | Persistence adapter, mission keys, factories, intelligence, commercial, … |
| **sessionStorage** | **No** (scoped search empty) | — |
| **IndexedDB** | **Yes** | `lib/persistence/adapters/local-adapter.ts` — overflow store `forgeos-persistence` / `kv` when payload > ~512KB |
| **Filesystem** | **Limited** | `lib/preview-runtime/sandbox-runner.ts` (`fs.writeFile`) for sandbox |
| **Database / Postgres** | **Stub** | `postgres-adapter.ts` always uses local; comments note future API routes |
| **Supabase** | **Dual meaning** | (1) persistence adapter best-effort remote `forgeos_entities`; (2) connections/skills/blueprints — not mission SoT |
| **In-memory** | **Yes** | Runtime Maps (execution, queue, scheduler, workers, event history); code-generation `Map`; MemoryOutputRepository on SSR |
| **JSON fixtures** | **Yes** | `lib/fixtures/*`, `venture-e2e/fixture-registry.ts`, creation-output/website-factory demos |

---

## 2. Persistence package (Program 3000)

**Keys (`PERSISTENCE_KEYS`):** workspaces, organizations, auth users, preferences, ventures, intelligence memory/decisions/ceo-memory, persist-* (knowledge, timeline, tasks, build-context, build-dna, roadmaps, documents, meta, versions, **snapshots**), autonomous-organization.

**Repositories:** workspace, organization, user, venture, memory, knowledge, knowledge-hub, timeline, ceo-decision, task, department, build-context, build-dna, roadmap, document.

**Bridges:** venture, workspace, auth, intelligence — sync legacy stores to same keys.

**Snapshots:** `forgeos-persist-snapshots` (max 10) — point-in-time copies, not live SoT.

**Supabase adapter:** writes local first; remote best-effort.

---

## 3. Parallel SoTs outside persistence package

| Domain | Keys / store | Class |
|--------|--------------|-------|
| Missions | `forgeos-mission-control-missions`, `-active`, decision logs, history, autonomous state/checkpoints | **Live SoT** |
| Creation outputs | `forgeos-creation-outputs-v5350` (+ change-requests, comparisons) | **Live SoT** |
| Auth session | `lib/auth/session-store.ts` | Session SoT |
| Intelligence layer | 40+ keys in `STORAGE_KEYS` | Live SoT |
| Factories | pipeline localStorage (website/mobile/application) | Live SoT (bypass) |
| Commercial / Cloud / Production / Launch / Beta | Dedicated `*_STORAGE_KEYS` | Namespaced SoTs |
| Mobile factory UI | `forgeos-mobile-factory` | Live |
| Capability / governance events | `forgeos-capability-events`, `forgeos-skill-governance-events` | Append logs |
| Code projects | In-memory Map (optional LS helpers exported) | Ephemeral SoT |

**Components writing LS directly:** `ApplicationFactoryDashboard.tsx`, `MobileFactoryDashboard.tsx` (evidence).

---

## 4. Source of truth classification

| Class | Examples |
|-------|----------|
| **Source of truth (client)** | Missions, ventures, workspaces/users, creation outputs, intelligence keys, factory pipelines |
| **Temp / ephemeral** | Runtime Maps, event bus history, FOS bridge caches, SSR memory repos, launch console analytics |
| **Snapshot / checkpoint** | `forgeos-persist-snapshots`, autonomous mission checkpoints, versioning modules |
| **Seed / fixture** | `lib/fixtures/*`, e2e registry — seed into LS, then LS is SoT |

---

## 5. Direct access vs repositories

| Pattern | Evidence |
|---------|----------|
| Repository API | `lib/persistence/repositories/*` |
| Bridges | Dual-write / sync to LS keys |
| Direct LS | Mission persistence, factory pipelines, many domain modules |
| UI direct LS | Factory dashboards |
| Incompatible shapes | Dual Workspace/Venture models reading related keys via different types |

---

## 6. Risks

1. **Multiple SoTs** for related concepts (mission vs venture vs creation-output) without transactional consistency.
2. **Factory bypass** of persistence package.
3. **Supabase/Postgres not productive** — assuming remote durability is incorrect today.
4. **IndexedDB overflow** can diverge from LS-only readers.
5. **SSR vs browser** memory fallbacks can hide empty state.

---

## Freeze implication

- No new global stores (freeze-rules).
- UI must not write persistence directly for new features — use repositories/adapters.
- New capabilities persist only through declared adapters.
