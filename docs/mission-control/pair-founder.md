# PROGRAM 5200 — AI Pair Founder

Mission Control extension that transforms the CEO from Q&A bot into a true co-founder: context-aware, memory-backed, contradiction-aware, and strategically coherent.

## Architecture

```
MissionControlShell
  └── conversation-engine.ts
        └── pair-founder-engine.ts (orchestrator)
              ├── venture-memory.ts
              ├── contradiction-detection.ts
              ├── risk-detection.ts
              ├── alternative-proposals.ts
              ├── decision-prioritization.ts
              ├── context-aware-recommendations.ts
              ├── founder-preferences.ts
              └── adapters/
                    ├── founder-memory-adapter → lib/founder-zero (venture-history)
                    ├── decision-graph-adapter → lib/ai-runtime/decision-graph
                    ├── context-engine-adapter → lib/ai-runtime/context-engine
                    ├── prompt-compiler-adapter → lib/ai-runtime/prompt-compiler
                    └── model-router-adapter → lib/ai-runtime/router
```

## Adapter reuse (read-only / public API)

| Adapter | Source module | Usage |
|---------|---------------|-------|
| Founder Memory | `@/lib/founder-zero` (`readValidationHistory`, `appendValidationHistory`) | Sync venture facts to Founder Zero history |
| Decision Graph | `@/lib/ai-runtime/decision-graph` (`writeRuntimeDecision`) | Record CEO decisions in runtime graph |
| Context Engine | `@/lib/ai-runtime/context-engine` (`buildAIContext`) | Build mission context blocks |
| Prompt Compiler | `@/lib/ai-runtime/prompt-compiler` (`compilePrompt`) | Compile CEO prompts when real AI enabled |
| Model Router | `@/lib/ai-runtime/router` (`routeModel`) | Route CEO task to best model |
| Executive Mesh | `lib/mission-control/adapters/executive-mesh-adapter` | Risk hints from mesh consult stub |

**No internals modified** in `lib/ai-runtime/`, `lib/executive-mesh/`, `lib/runtime/`, or `lib/skills/`.

## Persistence

- **Venture memory**: `localStorage` key `forgeos-pair-founder-memory-{missionId}`
- **Founder preferences**: `localStorage` key `forgeos-pair-founder-prefs-{missionId}`
- **Decision log**: append-only in mission object + dedicated `forgeos-mission-control-decision-log-{missionId}` key (never truncated on save)

## UI — CEO Insights Panel

`components/mission-control/CEOInsightsPanel.tsx` displays (Spanish FHIS):

- **Lo que el CEO entiende** — venture understanding summary
- **Qué ha cambiado** — delta since last turn
- **Riesgos detectados** — risk list with severity badges
- **Próxima recomendación** — prioritized action with justification and alternatives

Placed in the left column below `MissionStatusPanel` in `MissionControlShell`.

## Heuristic mode

When real AI is disabled, pair-founder uses heuristic logic (contradiction patterns, phase-based risks, decision scoring). All panels and memory persistence still work.

## Acceptance criteria

1. **Context throughout conversation** — `venture-memory.ts` persists per `missionId`
2. **Recommendations change** — `contradiction-detection.ts` triggers reframe + insight update
3. **Never lose history** — `mergeDecisionLog` append-only in `mission-persistence.ts`
4. **No contradictory responses** — `reframeReplyForContradictions` before CEO message sent
5. **Auto Pilot + Decision Center** — `decision-prioritization.ts` feeds `getNextPendingDecision`
