# Dependency Map — PROGRAM 6000

**Date:** 2026-07-24  
**Layers (as observed, not aspirational):** Presentation → Coordinators (Mission Control / Factories) → Runtime / Skills / Capabilities / AI → Persistence / Providers.

```
┌─────────────────────────────────────────────────────────────┐
│ Presentation: app/, components/                             │
├─────────────────────────────────────────────────────────────┤
│ Mission Control / Command Center / Studio coordinators      │
├──────────────┬──────────────┬───────────────────────────────┤
│ Factories    │ AI Runtime   │ Skills / Capabilities         │
├──────────────┴──────────────┴───────────────────────────────┤
│ Runtime Kernel (event-bus, scheduler, queue, workers, FSM)  │
├─────────────────────────────────────────────────────────────┤
│ Persistence adapters/repos │ Providers (AI, Supabase, …)    │
└─────────────────────────────────────────────────────────────┘
```

`src/core/**` is a **parallel stub stack** (not yet wired as productive dependency root).

---

## Allowed / intended direction (evidence of current practice)

| From → To | Status today |
|-----------|--------------|
| Presentation → Mission Control / factory facades | Common |
| Mission Control → Factories / creation-output / multi-output | Common |
| Runtime internals → event bus adapters | Common |
| Persistence repos → domain types | Common |
| Capabilities → providers (internal) | Expected |

---

## Violations (evidence)

### UI → Engine

| Evidence | Path |
|----------|------|
| Conversation engine from shell | `components/mission-control/MissionControlShell.tsx` → `conversation-engine` |
| Enterprise engines | `components/enterprise/*` → `usage-engine`, `billing-engine`, `rbac-engine`, … |
| Execution engine lab | `components/lab/ExecutionEngineLab.tsx` → `lib/runtime/execution-engine` |
| Ecosystem / marketplace engines | `components/ecosystem/*`, `marketplace/EcosystemStoreView.tsx` |
| Build-engine functions | `components/ceo-office/BuildQueuePanel.tsx` |

**Freeze:** no *new* engine imports from components; route new UI through facades/adapters.

### UI → Provider

| Result | Notes |
|--------|-------|
| **Not found** | No `components/` / `app/` imports of `@/lib/ai/providers` or `getAIProvider` in audit greps |
| Soft | Components import AI **types** only in places |

### Domain → React / Next.js

| Path | Evidence |
|------|----------|
| `lib/live-mission/live-mission-store.ts` | `"use client"` + React hooks |
| `lib/os/shell-context.tsx` | `react` + `next/navigation` |
| `lib/design-system/types.ts` | React type-only |
| `src/core/domain/**` | **No** react/next imports (compliant) |
| `lib/domain/**` | **No** react/next imports |

### Factory → localStorage

| Path | Evidence |
|------|----------|
| `lib/website-factory/pipeline.ts` | Direct getItem/setItem |
| `lib/mobile-factory/pipeline.ts` | Same |
| `lib/application-factory/pipeline.ts` | Same |

### Runtime → component

| Result |
|--------|
| **Not found** — `lib/runtime` has no `@/components` imports |

### Capability → route

| Result |
|--------|
| **Not found** — `lib/capabilities` has no `@/app` / route string imports |

### Circular dependencies

| Cycle | Evidence |
|-------|----------|
| `lib/mission-control` ↔ `lib/live-mission` | MC index re-exports live-mission; live-mission imports MC types/persistence/emitter |
| `lib/creation-output` ↔ `lib/multi-output` | Soft: dynamic import from creation-output; static type imports reverse |

---

## Layer notes

| Layer | Key packages |
|-------|--------------|
| Presentation | `app/`, `components/` |
| Mission Control | `lib/mission-control/` |
| Factories | `lib/*-factory`, `lib/build-platform/*-factory` |
| AI Runtime | `lib/ai-runtime/`, `lib/ai-orchestration/`, `lib/ai-gateway/` |
| Skills | `lib/skills/**`, `lib/skills-store/`, `lib/skills-governance/` |
| Capabilities | `lib/capabilities/` |
| Runtime | `lib/runtime/**` |
| Build | `lib/build-platform/`, `lib/build-engine/`, `lib/real-build-flow/` |
| Deployment | `lib/preview-deployment/`, `lib/cloud-foundation/` |
| Persistence | `lib/persistence/` |

---

## Architecture check coverage

`npm run architecture:check` warns/fails on a subset of these (React in `src/core/domain`, presentation→capabilities, localStorage in domain, known cycles). See script header for exit-code policy.
