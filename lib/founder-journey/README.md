# Founder Journey (Epic 7.1)

Guided path from idea to launch for founders. No runtime, workers, or build context — heuristic progress from venture data only.

## Modules

| File | Role |
|------|------|
| `types.ts` | Phase IDs, status, blockers, snapshot types |
| `phases.ts` | 15 official phases with objectives |
| `journey-engine.ts` | Progress, blockers, next action, value per phase |
| `journey-timeline.ts` | Timeline builder + Epic 7.0 pipeline mapping |
| `journey-store.ts` | UI state + venture resolution (localStorage) |

## Usage

```ts
import { computeFounderJourney, resolveJourneyVenture } from "@/lib/founder-journey";

const venture = resolveJourneyVenture(ventureId);
const journey = computeFounderJourney(venture);
```

## Route

`/founder-journey?ventureId=<id>`

## Coexistence with Epic 7.0

The 7-step user pipeline (Idea → Validación → Mercado → …) is derived from the 15 phases via `computeUserPipelineProgress`. Both views can be shown without conflict.
