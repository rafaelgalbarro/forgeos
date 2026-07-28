# Venture Workspace (`lib/venture-workspace`)

Official founder command center data layer for Epic 7.0. One workspace per venture.

## Principles

- **No runtime imports** — never pulls from `lib/runtime/*`, `executive-runtime`, or `ai-orchestration`.
- **Heuristic assembly** — derives display data from venture store + portfolio helpers.
- **Founder lifecycle** — maps venture state to: Idea → Validación → Mercado → Producto → Construcción → Lanzamiento → Crecimiento.

## Modules

| Module | Purpose |
|--------|---------|
| `types.ts` | Workspace snapshot and section types |
| `founder-lifecycle.ts` | 7-stage founder pipeline mapping |
| `workspace-data.ts` | Assembles full `VentureWorkspaceSnapshot` |
| `ceo-brief.ts` | Venture-scoped Director General brief |
| `startup-score.ts` | Score display via portfolio helpers |
| `investment-readiness.ts` | Investor readiness heuristics |
| `next-actions.ts` | Recommended actions |
| `timeline.ts` | Activity timeline |

## Usage

```ts
import { buildVentureWorkspaceData } from "@/lib/venture-workspace";

const snapshot = buildVentureWorkspaceData(venture);
```

## UI

See `components/venture-workspace/` for FHIS section components and `VentureWorkspaceShell`.
