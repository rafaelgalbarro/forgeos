# Executive Board Runtime

## Members

CEO, CTO, CPO, CMO, CFO, COO, Legal, Growth, Research, UX, Architecture, Operations.

## Module

`lib/intelligence/board-runtime.ts` — `runExecutiveBoardSession(venture)`

## Per-member output

Each opinion is structured (`BoardOutput`):

- Opinion / position
- Arguments for / against
- Risks
- Opportunities
- Confidence (0–1)
- Suggested action
- Vote

## Orchestration

`runBoardAiTask("BOARD_DEBATE", member, venture)` via `lib/platform/intelligence/board-ai-adapter.ts`.

Role focus is injected per member (e.g. CFO → unit economics, Legal → compliance).

## Fallback

Per-member failures degrade to `heuristicBoardOpinion()` — never blocks the session.

## Session result

`BoardSessionResult` includes `sessionId`, all opinions, latency, and ai/heuristic/mock counts for observability.
