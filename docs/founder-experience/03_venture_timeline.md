# Venture Timeline (Epic 7.3)

Complete history of each venture with a GitHub-style vertical timeline.

## Route

`/venture/[id]/timeline` — loads venture from localStorage store, links back to `/venture/[id]` workspace.

## Features

- **Date groups** — events grouped by day (Hoy, Ayer, or full date)
- **Commit-like dots** — color-coded by event category
- **Filters** — department, category, date range (sidebar)
- **Search** — across title, description, category, department, actor, source
- **Group toggle** — switch between date view and department view

## Event sources (read-only)

1. Venture fields (`createdAt`, sections, status, intelligence, PRD, etc.)
2. Intelligence layer memory (`getVentureMemory`)
3. Decision graph (`getDecisionsForVenture`, `getExecutiveGraphForVenture`)
4. Executive runtime memory (`getExecutiveRuntimeMemory`)
5. AI orchestration executions (`getExecutionsForVenture`)
6. Heuristic milestones when sparse history

## Departments

executive, research, product, engineering, build, qa, growth, finance, capital, memory

## Categories

CEO Reviews, Board Decisions, Research, Product, Architecture, Build, QA, Deploy, Marketing, Finance, Capital, Memory, Decision Graph

## Code

- Library: `lib/venture-timeline/`
- UI: `components/venture-timeline/`
- Styles: `styles/fhis/components.css` (`.fhis-vtl-*`)
