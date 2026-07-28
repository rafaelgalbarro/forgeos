# Go To Market — PROGRAM 5700

Coordinator-only module that generates an 8-deliverable launch plan from mission context and integrates with Mission Control.

## Deliverables

| ID | Label | Generator |
|----|-------|-----------|
| `launchPlan` | Plan de Lanzamiento | `launch-plan-generator.ts` |
| `contentCalendar` | Calendario de Contenido | `content-calendar-generator.ts` |
| `linkedInPlan` | Plan LinkedIn | `linkedin-plan-generator.ts` |
| `emailCampaigns` | Campañas Email | `email-campaigns-generator.ts` |
| `productHunt` | Checklist Product Hunt | `product-hunt-checklist.ts` |
| `pressKit` | Press Kit | `press-kit-generator.ts` |
| `websiteReview` | Revisión Web | `website-review-generator.ts` |
| `onboardingChecklist` | Checklist Onboarding | `onboarding-checklist-generator.ts` |

## Architecture

```
lib/mission-control/go-to-market/
├── types.ts
├── gtm-context.ts          # venture name, industry from mission + venture-memory
├── gtm-orchestrator.ts     # generateGTMPackage, detectGTMIntent
├── gtm-persistence.ts      # localStorage forgeos-gtm-{missionId}
├── gtm-snapshots.ts        # lightweight SSR snapshot
├── *-generator.ts          # heuristic generators (8)
└── index.ts

components/mission-control/gtm/
├── GoToMarketPanel.tsx     # tabbed hub (lazy dynamic imports)
└── *View.tsx               # one view per deliverable
```

## Triggers

1. **Phase auto-trigger** — When mission reaches `VALIDATE`, `DEPLOY`, or `OPERATE`, `conversation-engine.ts` calls `applyGTMToMission()` via `continueMissionFlow`.
2. **User intent** — Messages matching `lanzar`, `go to market`, `gtm`, `launch plan`, etc. trigger `applyGTMAsync()` in `processConversationTurn`.
3. **Manual** — "Generar plan GTM" button in `GoToMarketPanel`.

## Events

`live-mission/event-emitter.ts` emits:

- Per deliverable: `"Plan de Lanzamiento generado"`, etc. (`type: "gtm"`)
- Complete: `"Plan de lanzamiento GTM completo"`

## Persistence

- Full package: `localStorage` key `forgeos-gtm-{missionId}`
- Mission carries lightweight `gtmSnapshot` for UI progress
- Regenerates when `contextHash` changes (venture name, idea, intention, industry, phase)

## UI

- **MissionProgressPanel** — lists 8 GTM deliverable statuses
- **GoToMarketPanel** — tabbed hub in main column when GTM generated
- Footer shows `PROGRAM 5700 — GO TO MARKET`

## Sample structure

```json
{
  "missionId": "mc-abc123",
  "ventureName": "Mi Venture",
  "launchPlan": {
    "summary": "Plan de lanzamiento de 8 semanas…",
    "targetLaunchDate": "2026-08-17",
    "phases": [{ "id": "prep", "name": "Pre-lanzamiento", "milestones": [] }]
  },
  "deliverableStatus": {
    "launchPlan": "ready",
    "contentCalendar": "ready"
  }
}
```

## Integration points

- `mission-flow.ts` — `GTM_TRIGGER_PHASES`, `isGTMPhase`, `gtm` snapshot domain for VENTURE
- `mission-snapshots.ts` — `gtmEnabled`, `gtmProgramVersion` on SSR snapshot
- `conversation-engine.ts` — intent detection + async orchestration
- No changes to Runtime, Executive Mesh, AI Runtime, or Skills internals
