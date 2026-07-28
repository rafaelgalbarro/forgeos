# Pair Founder Context

## Sources (adapters only — no duplicate storage)

| Source | Adapter | Data consumed |
|--------|---------|---------------|
| Venture Memory | `venture-memory.ts` | keyFacts, priorDecisions, strategyNotes |
| Founder Memory | `adapters/founder-memory-adapter.ts` | Founder Zero validation history |
| Founder Profile | `founder-profile.ts` | objetivos, presupuesto, restricciones, etc. |
| Decision Graph | `adapters/decision-graph-adapter.ts` | Records new decisions |
| Context Engine | `adapters/context-engine-adapter.ts` | Builds context blocks |
| Executive Mesh | `executive-mesh-adapter` (Mission Control) | Risk hints |

## Context assembly

`pair-founder-context.ts` builds `MissionContext` from:

1. Mission object (phase, intention, snapshots, pending decisions)
2. Venture memory snapshot (read-only)
3. Founder profile (workspace-scoped, adapted from user input)
4. Mesh hints (optional)

## Hypotheses and priorities

Generated heuristically each turn:

- **Hypotheses**: inferred strategic assumptions (segment, model, growth)
- **Priorities**: ordered list from pending decisions + weak snapshots + profile constraints

## Context change flow (STEP 5)

When user input matches a context-change pattern:

1. `detectContextChange()` identifies affected artifacts
2. `applyContextChangeToMission()` marks mission status without full regeneration
3. `explainContextChange()` surfaces summary in CEO reply
4. Dependencies recalculated via artifact dependency map

Integrates with `mission-session` / `mission-runner` (Program 5150) via shared mission status markers.
