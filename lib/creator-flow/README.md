# Creator Flow (Epic 7.7)

Definitive continuous startup creation experience at `/creator`.

## Pipeline (10 steps)

Idea → Discovery → Research → CEO → Board → Product → Architecture → Build → Deploy → Growth

## Integration map

| Step | Module | Adapter |
|------|--------|---------|
| Idea, Discovery | `lib/founder-journey/` | `adaptJourneyProgress` |
| All steps | `lib/venture-workspace/` | `adaptWorkspaceSnapshot` |
| Research, Knowledge | `lib/knowledge/` | `adaptKnowledgeRefs` |
| CEO | `lib/venture-workspace/ceo-brief` | `adaptCeoBrief` |
| Board | Venture Simulator + journey | `adaptBoardDecision` |
| Timeline | `lib/venture-timeline/` | `adaptTimelineHighlights` |
| Build | `lib/build-platform/release-manager` | `adaptReleaseSummary`, `adaptBuildStatus` |
| Runtime | `lib/runtime/execution-engine` | `adaptBuildPipelineLabel` (founder labels only) |

No duplicated business logic — orchestrator composes existing modules via thin adapters.

## Store

`creator-store.ts` persists flow state per venture in localStorage (`forgeos-creator-flow`).

## Founder UX constraints

- No "Event Bus", "Worker", or "Scheduler" labels in UI
- CEO/Board steps show executive summary prose, not chat
