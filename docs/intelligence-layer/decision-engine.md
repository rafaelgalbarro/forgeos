# Decision Engine

## Decision Type

```typescript
interface Decision {
  id: string;
  ventureId: string;
  title: string;
  description: string;
  motive: string;
  takenBy: string;       // default "founder"
  date: string;
  expectedImpact: string;
  actualImpact?: string;
  reversible: boolean;
  dependencies: string[];
  status: "pending" | "active" | "completed" | "reverted";
}
```

## Storage

All decisions stored in `forgeos-intelligence-decisions` as a flat array.

## API

| Function | Description |
|----------|-------------|
| `registerDecision(input)` | Create new decision (idempotent by id) |
| `getDecisionsForVenture(ventureId)` | Filter by venture |
| `getDecisionById(id)` | Single lookup |
| `updateDecision(id, patch)` | Update status, impact, description |

## Auto-Registration (Heuristics)

On `syncVentureMemory`, milestones are auto-registered if not already present:

1. **Idea registrada** — always
2. **Inteligencia aceptada** — when `intelligenceAccepted`
3. **Discovery completado** — when discovery answers exist
4. **Research generado** — when `researchReport` exists
5. **Simulador ejecutado** — when simulator result exists
6. **PRD generado** — when `productPRD` exists
7. **Build plan iniciado** — when engineering sections have content

Decisions link back to venture memory via decision ID arrays.
