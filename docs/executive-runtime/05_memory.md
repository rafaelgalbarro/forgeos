# Memory Layer

## Executive runtime memory

`lib/ai-orchestration/executive-memory-writer.ts`  
Storage key: `forgeos-executive-runtime-memory`

### Never lose history

Append-only style records (capped lists, newest first):

| Category | Function |
|----------|----------|
| Executive Decisions | `writeExecutiveDecision()` |
| CEO Reviews | `writeCeoReview()` |
| Board Reviews | `writeBoardReview()` |
| Consensus History | `writeConsensusHistory()` |
| Strategic Changes | `strategicChanges` (extensible) |
| Rejected/Reversed | `rejectedDecisions` (extensible) |
| Lessons Learned | `appendLessonLearned()` |

Also integrates with:

- `ceo-memory` — CEO briefings
- `history` — venture timeline events
- `ai-orchestration-executions` — per-task execution log

## AI execution memory

`lib/ai-orchestration/memory-writer.ts` — provider, model, latency, tokens estimate, cost, warnings, `decisionId`, `boardSessionId`.

## Portfolio memory

Built before executive run via `buildPortfolioMemory()` — aggregated risks, opportunities, patterns, insights.

## Reversals

Decision graph nodes mark `reversible: true` by default. Reversal records go to `rejectedDecisions` when Epic 3.3+ implements explicit undo flows.
