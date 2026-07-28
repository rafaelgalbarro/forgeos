# Executive Board Module

## Members (12)

CEO, CTO, CPO, CMO, CFO, COO, Legal, Growth, Research, UX, Architecture, Operations

## Card fields

| Field | Source |
|-------|--------|
| Estado | `opinion.source` → AI / Mock / Heurístico |
| Opinión | `opinion.opinion` |
| Confianza | `opinion.confidence` |
| Voto | `opinion.vote` |
| Riesgo | first item in `opinion.risks` |
| Prioridad | `opinion.suggestedAction` |

## Interaction

"Ver razonamiento" expands full `BoardOpinion` JSON per member.

## Data flow

```
runExecutiveIntelligence → runExecutiveBoardSession → writeBoardReview
  → boardOpinions from latest board review in memory
```

Members without opinions show "Pendiente" state.

## Component

`components/lab/mission-control/ExecutiveBoard.tsx` — uses FHIS `ExecutiveCard`.
