# PROGRAM 6000 — Digital CEO

Mission Control's permanent proactive CEO layer. The Digital CEO guides the founder on project open — it does not replace user decisions.

## Brief types (6)

| Brief | Purpose | Primary sources |
|-------|---------|-----------------|
| **Morning Brief** | Time-aware daily opening summary | Mission state, pending decisions, pair-founder risks |
| **Mission Brief** | Current mission one-pager | Phase, snapshots, live execution progress |
| **CEO Brief** | Strategic perspective + confidence | pair-founder (5200), venture memory, recommendations |
| **Daily Priorities** | Top 3–5 ranked actions | Decision Center (5100), live-mission queue, risks |
| **Weekly Review** | Week-over-week progress | Timeline (5300) since last Monday |
| **Executive Digest** | Board insights without CoT | Executive Board (5400), Executive Mesh adapter |

## Proactive initiation flow

```
User opens /mission-control or /mission-control/[missionId]
        │
        ▼
MissionControlShell loads mission from localStorage
        │
        ▼
initializeMissionSession() → proactive-init.startMissionSession()
        │
        ├─ Blank mission (no intention/messages) → skip
        │
        └─ Returning mission
              │
              ├─ refreshDigitalCEOState() — compose 6 briefs
              ├─ Once per day: inject CEO opening message + timeline "Morning Brief generado"
              └─ UI: ProactiveOpeningMessage + DigitalCEOPanel (non-blocking)
```

## Adapters (reuse only)

- `lib/mission-control/decision-center.ts` — pending decisions, prioritization
- `lib/mission-control/pair-founder/` — venture memory, risks, recommendations
- `lib/mission-control/live-mission/` — queue tasks, event emitter, timeline events
- `lib/mission-control/executive-board/` — executive summary (summary only)
- `lib/mission-control/adapters/executive-mesh-adapter.ts` — council snapshot
- `lib/mission-control/adapters/ai-runtime-adapter.ts` — read-only `isRealAiEnabled`, telemetry
- Optional hints: GTM (5700), investor (5800), autonomous company (5600) via `module-adapters.ts`

**Not modified:** Runtime, Executive Mesh internals, AI Runtime internals, Skills.

## Persistence

- Key: `forgeos-digital-ceo-{missionId}` (localStorage)
- Tracks `lastMorningBriefDate` — Morning Brief regenerated once per calendar day
- Weekly Review compares timeline events since last Monday

## UI placement

- **Center (top):** `ProactiveOpeningMessage`, `DigitalCEOPanel` (tabs)
- **Left column:** compact `DailyPrioritiesList` + `CEOBriefCard`
- Dismissible — does not block conversation input

## Public API

```ts
import {
  initializeMissionSession,
  composeAllBriefs,
  dismissDigitalCEO,
  DIGITAL_CEO_VERSION,
} from "@/lib/mission-control";
```

## Conversation engine

- `initializeMissionSession()` on session start
- CEO replies include one pending decision hint per turn when relevant
- Links to Decision Center titles and pair-founder risks
