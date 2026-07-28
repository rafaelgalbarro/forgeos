# Executive Intelligence Runtime (Epic 3.2)

ForgeOS executive brain: how the platform **thinks**, **debates**, **decides**, **records**, and **learns** — without activating Build Execution (Epic 3.3).

## Mandatory flow

```
Founder → CEO AI → Executive Board → Consensus Engine → Executive Decision → Decision Graph → Memory → Dashboard
```

All AI calls traverse:

**Context Builder → AI Gateway → Provider Router → Response Validator → Memory Writer → Decision Graph Writer**

Never direct provider calls from CEO, Board, or Dashboard.

## Modules

| Module | Location |
|--------|----------|
| CEO Runtime | `lib/ceo-office/executive-runtime.ts`, `lib/platform/ceo/ai-adapter.ts` |
| Board Runtime | `lib/intelligence/board-runtime.ts` |
| Consensus Engine | `lib/intelligence/consensus-engine.ts` |
| Decision Graph | `lib/ai-orchestration/decision-graph-writer.ts` |
| Executive Memory | `lib/ai-orchestration/executive-memory-writer.ts` |
| Observability | `lib/ai-orchestration/observability.ts` |
| Dashboard bridge | `lib/ceo-office/ceo-ai-bridge.ts`, `components/dashboard/CeoBriefingCard.tsx` |
| Portfolio ranking | `lib/ceo-office/portfolio-ranking.ts` |

## Docs

1. [CEO Runtime](./01_ceo.md)
2. [Executive Board](./02_board.md)
3. [Consensus Engine](./03_consensus.md)
4. [Decision Graph](./04_decision_graph.md)
5. [Memory Layer](./05_memory.md)
6. [Dashboard Wiring](./06_dashboard.md)
7. [Future: Build Execution](./07_future_build.md)

## Fallback policy

- **AI Generated** — live provider, validated JSON
- **Mock** — no API keys; orchestration mocks
- **Heuristic** — gateway/validation failure or pure rules

UI never infinite-loads; `/dashboard` always renders.

## Next epic

Epic 3.3 — **Build Execution Runtime** (documented, not implemented). See [07_future_build.md](./07_future_build.md).
