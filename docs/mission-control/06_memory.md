# Memory Timeline

## Events (chronological, newest first)

| Event type | Source record |
|------------|---------------|
| CEO Review | `memoryWrites.ceoReviews` |
| Board Consensus | `memoryWrites.boardReviews` |
| Nueva decisión — Consenso | `memoryWrites.consensusHistory` |
| Executive Decision | `memoryWrites.executiveDecisions` |

Uses FHIS `Timeline` — human-readable titles and descriptions, not JSON by default.

"Ver detalles técnicos" expands full memory snapshot.

## Writers

`lib/ai-orchestration/executive-memory-writer.ts` — called during `runExecutiveIntelligence`.

## Component

`components/lab/mission-control/MemoryTimeline.tsx`
