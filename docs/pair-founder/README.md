# PROGRAM 5200 — AI Pair Founder

Mission Control extension that transforms the CEO from Q&A bot into a strategic co-founder: context-aware, memory-backed, contradiction-aware, and strategically coherent.

## Architecture

```
MissionControlShell
  └── conversation-engine.ts
        └── lib/pair-founder/pair-founder-engine.ts
              ├── pair-founder-context.ts
              ├── venture-memory.ts (shared storage keys)
              ├── founder-profile.ts (workspace-scoped)
              ├── contradiction-detector.ts
              ├── risk-advisor.ts
              ├── alternative-generator.ts
              ├── priority-advisor.ts
              ├── recommendations.ts
              ├── context-change-handler.ts
              └── adapters/
                    ├── founder-memory-adapter → lib/founder-zero
                    ├── decision-graph-adapter → lib/ai-runtime/decision-graph
                    ├── context-engine-adapter → lib/ai-runtime/context-engine
                    └── prompt-compiler-adapter → lib/ai-runtime/prompt-compiler
```

## Invocation rules (STEP 8)

Pair Founder engine runs **only** on:

| Trigger | Entry point |
|---------|-------------|
| User message | `conversation-engine.ts` → `finalizeWithPairFounder` |
| Decision resolved | `resolveDecisionById` → trigger `decision_resolved` |
| Context change | `context-change-handler.ts` detects pattern in user input |
| Explicit review | User writes "revisar" / "analiza" / "co-founder" |

**Never** on page mount or first render. Initial state uses `createEmptyCeoInsight()` (static placeholder).

## Persistence

| Data | Storage key |
|------|-------------|
| Venture memory | `forgeos-pair-founder-memory-{missionId}` |
| Founder preferences | `forgeos-pair-founder-prefs-{missionId}` |
| Founder profile | `forgeos-founder-profile-{workspaceId}` |
| Decision log | `forgeos-mission-control-decision-log-{missionId}` (append-only) |

## UI

`components/mission-control/CEOInsightsPanel.tsx` — left column below MissionStatusPanel.

Does **not** duplicate Decision Center; links to it for pending decisions.

## Modes

- **Heuristic** (default): pattern-based contradiction detection, phase risks, decision scoring
- **Real AI** (`ENABLE_REAL_AI=true`): AI Runtime adapters for context engine, prompt compiler, decision graph

See also: [context.md](./context.md), [contradiction-detection.md](./contradiction-detection.md), [recommendations.md](./recommendations.md), [privacy.md](./privacy.md), [test-cases.md](./test-cases.md)
