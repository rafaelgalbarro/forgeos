# PROGRAM 5900 — Exit Strategy

Mission Control extension that defines growth and exit strategy from the start of the venture. User selects one exit path; Mission Control adapts Roadmap, Finanzas, Marketing, and Producto accordingly.

## Architecture

```
MissionControlShell
  └── exit-orchestrator.ts (coordinator)
        ├── exit-strategy-registry.ts (5 strategies)
        ├── exit-strategy-selector.ts (selection + localStorage)
        ├── strategy-adaptations.ts (per-domain plans)
        ├── exit-readiness-scorer.ts
        ├── strategic-alignment.ts
        ├── decision-impact.ts
        └── adapters/
              ├── roadmap-adapter.ts → PROGRAM 5600
              ├── investor-adapter.ts → PROGRAM 5800
              ├── gtm-adapter.ts → PROGRAM 5700
              └── product-adapter.ts → factory snapshots
```

## Exit strategy options (5)

| ID | Label ES | Focus |
|----|----------|-------|
| `venta` | Venta | M&A exit, tracción, due diligence |
| `crecimiento_independiente` | Crecimiento independiente | Bootstrap, unit economics |
| `dividendos` | Dividendos | Cash cow, márgenes, flujo de caja |
| `venture_capital` | Venture Capital | Growth, fundraising, TAM |
| `patrimonio_familiar` | Patrimonio familiar | Legado generacional, gobernanza |

## Adapter reuse (read-only / public API)

| Adapter | Source module | Usage |
|---------|---------------|-------|
| Roadmap | `lib/mission-control/autonomous-company/workspace-snapshots` | Roadmap milestones context |
| Investor Mode | `lib/mission-control/investor-mode` | Financial model emphasis |
| Go To Market | `lib/mission-control/go-to-market` | GTM intensity, brand vs performance |
| Product | Mission snapshots (prd, application, website) | Build scope adjustments |
| Venture Memory | `lib/mission-control/pair-founder/venture-memory` | Strategy notes persistence |
| Contradiction Detection | `lib/mission-control/pair-founder/contradiction-detection` | Exit path conflict flags |

**No internals modified** in Runtime, Executive Mesh, AI Runtime, or Skills.

## Metrics

### Exit Readiness (0–100)

Composite score from strategy-specific dimensions:

- **Venta**: tracción, due diligence, moat
- **Crecimiento independiente**: unit economics, eficiencia, crecimiento orgánico
- **Dividendos**: márgenes, retención, estabilidad
- **Venture Capital**: fundraising, crecimiento, mercado
- **Patrimonio familiar**: gobernanza, marca, sucesión

Each dimension derives from mission snapshot progress + phase + venture memory.

### Strategic Alignment (0–100)

Compares current snapshot progress per domain (roadmap, finanzas, marketing, producto) against strategy domain weights. Penalizes high-severity misaligned areas.

### Decision Impact

Per pending decision, rules map `DecisionCategory` + option patterns to `positive` / `neutral` / `negative` impact with Spanish explanation.

## Persistence

- **Exit strategy selection**: `localStorage` key `forgeos-exit-strategy-{missionId}`

## UI (Spanish FHIS)

| Component | Location |
|-----------|----------|
| `ExitStrategyPanel` | Left column — 5 strategy cards |
| `ExitReadinessView` | Standalone detail view |
| `StrategicAlignmentView` | Standalone detail view |
| `DecisionImpactList` | Decision Center badges |
| CEO Insights inline | Exit Readiness + Alignment meters |
| MissionProgressPanel | Exit strategy indicator |

Visible when mission intention is VENTURE (or DISCOVERY→venture confirmed).

## Conversation integration

- `conversation-engine.ts` detects exit strategy mentions
- ONE clarifying question if ambiguous (`EXIT_STRATEGY_CLARIFYING_QUESTION`)
- Strategy change emits live-mission event + "Qué ha cambiado" delta

## Acceptance criteria

1. User selects ONE exit strategy (changeable with impact warning)
2. Roadmap/Finanzas/Marketing/Producto adaptations generated per strategy
3. Exit Readiness + Strategic Alignment shown in CEO Insights
4. Decision Impact badges on pending items
5. Contradiction detection flags exit path conflicts
6. Pair-founder recommendations update when strategy changes
