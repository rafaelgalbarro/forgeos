# Venture Timeline (`lib/venture-timeline`)

Complete venture history with GitHub-style timeline, filters, search, and department grouping (Epic 7.3).

## Principles

- **No runtime imports** — never pulls from `lib/runtime/*`.
- **Read-only stores** — reads executive memory, decision graph, and intelligence layer from existing localStorage readers.
- **Heuristic fallback** — synthesizes milestone events from venture fields when history is sparse.

## Event sources

| Source | Reader | Categories |
|--------|--------|------------|
| `venture` | `VentureProject` fields | Product, Research, Finance |
| `heuristic` | Sections, status, timestamps | Architecture, QA, Marketing, Capital |
| `memory` | `getVentureMemory` | Memory |
| `decision-graph` | `getDecisionsForVenture`, `getExecutiveGraphForVenture` | Decision Graph, CEO Reviews |
| `executive-memory` | `getExecutiveRuntimeMemory` | CEO Reviews, Board Decisions |
| `ai-orchestration` | `getExecutionsForVenture` | Build, Architecture, QA |

## Modules

| Module | Purpose |
|--------|---------|
| `types.ts` | `TimelineEvent`, departments, categories, filters |
| `event-registry.ts` | Event type definitions and labels |
| `timeline-builder.ts` | Assemble events from all sources |
| `timeline-filters.ts` | Department, category, date range filters |
| `timeline-search.ts` | Title/description search |
| `timeline-grouping.ts` | Group by department or date |

## Usage

```ts
import {
  buildVentureTimelineSnapshot,
  applyTimelineFilters,
  searchTimelineEvents,
  groupTimelineByDate,
} from "@/lib/venture-timeline";

const snapshot = buildVentureTimelineSnapshot(venture);
const filtered = applyTimelineFilters(snapshot.events, { departments: ["executive"] });
const results = searchTimelineEvents(filtered, "CEO");
const groups = groupTimelineByDate(results);
```

## UI

See `components/venture-timeline/` and route `/venture/[id]/timeline`.
