# ForgeOS AI Orchestration

Epic 3.1 — Professional AI pipeline for CEO, Board, and Build.

## Pipeline

```
Context Builder → AI Gateway → Response Validator → Memory Writer → Decision Graph
```

No module calls providers directly.

## Entry point

```ts
import { runOrchestratedAiTask } from "@/lib/ai-orchestration";
```

## Adapters

- `lib/platform/ceo/ai-adapter.ts` — `runCeoAiTask`
- `lib/platform/intelligence/board-ai-adapter.ts` — `runBoardAiTask`
- `lib/platform/build/ai-adapter.ts` — `runBuildAiTask`

Not wired to UI yet.
