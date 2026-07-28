# Safe Zones — Program 4290

Parallel work is allowed **only** when each active agent holds a distinct zone. **One agent per zone at a time.**

## Zone definitions

| Zone | Paths | Owner | Max concurrent agents |
|------|-------|-------|----------------------|
| **Runtime** | `lib/runtime/`, `lib/workers/`, `app/lab/runtime-*`, `app/lab/task-queue/`, `app/lab/execution-engine/`, `app/lab/state-machine/` | Runtime Team | 1 |
| **UX** | `lib/navigation/`, `lib/home/`, `lib/design-system/`, `components/home/`, `components/layout/`, `components/os/`, `app/page.tsx` | UX Team | 1 |
| **Factories** | `lib/build-platform/`, `lib/build-engine/`, `lib/build-pipeline/`, `lib/real-build-flow/`, `lib/real-execution/`, `lib/venture-factory/`, `app/lab/*-factory/`, `app/os/build/` | Build Team | 1 |
| **Cloud** | `lib/production-readiness/`, `lib/commercial/`, `app/production/`, `app/billing/`, `app/health/` | Production + Commercial | 1 |
| **Docs** | `docs/` (all), `app/docs/`, `app/engineering/` | Architecture Owner | 2 (docs-only) |
| **Labs** | `app/lab/` (harness pages), `lib/lab/`, `lib/founder-zero/`, `lib/venture-e2e/` | Validation Team | 1 |
| **Integrations** | `lib/connections/`, `app/lab/real-connections/` | Connections Team | 1 |

## Engine zones (strict — never shared)

These zones overlap dependency graph cores. **Never** assign two agents simultaneously:

| Zone | Paths |
|------|-------|
| **AI Runtime** | `lib/ai-runtime/`, `lib/ai-control/`, `lib/ai-gateway/`, `lib/ai-orchestration/` |
| **Executive Mesh** | `lib/executive-mesh/`, `lib/board/`, `lib/fos/`, `lib/ceo/`, `lib/autonomous-organization/` |
| **Skills** | `lib/skills/`, `lib/skills-governance/`, `lib/skills-store/`, `lib/capabilities/` |

## Zone compatibility matrix

| Zone A | Zone B | Parallel? |
|--------|--------|-----------|
| Docs | Any | ✅ (if A is docs-only) |
| UX | Labs | ✅ (disjoint paths) |
| Cloud | Docs | ✅ |
| Runtime | AI Runtime | ❌ |
| Executive | Skills | ❌ |
| Factories | Integrations | ⚠️ (coordinate on `real-execution`) |
| UX | Runtime | ❌ (nav may import runtime metrics) |
| Cloud | UX | ⚠️ (both may touch `app/` — serialize) |

## Zone checkout protocol

Before editing, agent declares:

```
ZONE: <name>
PATHS: <explicit list>
PROGRAM: <e.g. 4290>
```

Architecture Owner rejects overlapping PATHS across active agents.

## Release of zone

Agent releases zone when:

1. PR merged or abandoned
2. No unstaged changes remain in zone paths
3. Build wave completed (if code changed)

## Safe default for unknown tasks

If zone is unclear → assign **Docs** zone only, or escalate to Architecture Owner.
