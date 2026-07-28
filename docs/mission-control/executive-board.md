# Executive Board (PROGRAM 5400)

Location: `lib/mission-control/executive-board/`  
UI: `components/mission-control/ExecutiveBoardReview.tsx`  
Orchestration: `lib/mission-control/executive-orchestration.ts`

## Objective

Mission Control automatically consults the **Executive Board** (7 departments) on important decisions and synthesizes a single **Executive Summary**. Users never see chain-of-thought, internal prompts, or raw mesh traces.

## Participants

| Department | Focus |
|------------|-------|
| CEO | Strategic alignment |
| CTO | Architecture & build viability |
| CFO | Pricing & unit economics |
| CMO | Brand & go-to-market |
| Legal | Compliance & regulatory risk |
| Research | Market validation |
| QA | Quality & deployment readiness |

Each department returns a structured snapshot:

- `recomendacion` — recommendation
- `riesgos` — risks (string array)
- `impacto` — `low` | `medium` | `high`
- `confianza` — 0–100

## Trigger conditions

The board activates when **any** of these apply (and intention is not DISCOVERY):

1. Mission phase **VALIDATE** or **DEPLOY**
2. Decision Center items: **Pricing**, **Architecture**, or **Deployment** (pending or recently resolved)
3. **Pair Founder** high-risk detection (`[high]` / `[critical]` in mission status risks)
4. **Contradiction** signals in recent messages
5. User explicitly asks for executive review (`consejo`, `executive review`, etc.)
6. **Auto Pilot** paused for an important decision approval

Logic: `executive-board/board-trigger.ts`

## Flow

```
Important decision detected
        ↓
Board session status: "reviewing"
        ↓
UI: "El Consejo Ejecutivo está evaluando alternativas…"
    Department spinners (CEO, CTO, CFO, CMO, Legal, Research, QA)
        ↓
Collect department reviews (heuristic + mesh hints)
        ↓
Synthesize Executive Summary
        ↓
Inject summary into CEO reply (one decision per turn)
        ↓
UI: Recomendación final · Alternativas · Riesgos
```

Events emitted via `live-mission/event-emitter.ts`:

- `executive_board_reviewing`
- `executive_summary_ready`

Timeline entries via `mission-timeline.ts`:

- `Consejo Ejecutivo evaluando: …`
- `Resumen ejecutivo listo (N% confianza)`

## Adapter approach (executive-mesh)

`executive-board/adapters/executive-mesh-board-adapter.ts` is **read-only**:

- Calls `consultExecutiveMesh()` from the existing mission-control adapter (summary only)
- Reads `meshGetMemoryRecords()` from `@/lib/executive-mesh` public API
- Sanitizes output — strips chain-of-thought markers
- **Does NOT** invoke `processExecutiveMeshRequest`, debate engine, or mesh-engine internals

When mesh data is unavailable, `department-review.ts` generates plausible heuristic reviews from mission context.

## UI

- **ExecutiveBoardReview** — expandable panel (lazy-loaded via `dynamic()`)
- Does **not** block conversation input; board runs async during turn processing
- Appears only when `showExecutiveBanner` is true

## Integration points

| Module | Role |
|--------|------|
| `executive-orchestration.ts` | Delegates to `executive-board-orchestrator` |
| `conversation-engine.ts` | Applies board after Pair Founder; injects summary into CEO message |
| `ExecutiveCouncilBanner.tsx` | Routes to `ExecutiveBoardReview` when session is active |
| `pair-founder` (5200) | High-risk strings feed board triggers |
| `live-mission` (5300) | Event emitter + timeline sync |

## What users do NOT see

- Mesh debate arguments
- Internal reasoning traces
- Pipeline stages or capability execution chains
