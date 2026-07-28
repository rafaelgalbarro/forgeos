# CEO Workspace (`lib/ceo-workspace`)

Executive office data layer for `/ceo` — Director General workspace (Epic 7.2).

## Purpose

Transforms the CEO from a chatbot into a permanent **Director General** executive office: structured briefing, priorities, risks, and agenda — delivered as natural prose, not a chat UI.

## Architecture

```
VentureProject[] (store)
        │
        ▼
getCeoOfficeBriefing()  ← lib/ceo-office/ceo-ai-bridge.ts
        │                      └── runExecutiveIntelligence()
        ▼
buildCeoWorkspaceData()
        ├── buildPortfolioSnapshot()
        ├── buildDailyAgenda()
        ├── buildCeoDirectorNarrative()
        └── section mappers (priorities, risks, …)
```

## Isolation

- **Only** `/ceo` and `app/api/ceo-workspace` import executive runtime via this module.
- Dashboard and other routes must **not** import `lib/ceo-workspace` or `runExecutiveIntelligence`.

## Fallback

| Condition | Source badge |
|-----------|--------------|
| Live AI response | `ai` → AI Generated |
| No API keys / mock provider | `mock` → Mock |
| Error or partial runtime | `heuristic` → Heuristic |

`buildCeoWorkspaceDataHeuristic()` provides instant client-side fallback using `lib/portfolio/ceo-briefing`.

## Key exports

- `buildCeoWorkspaceData(ventures)` — async, full pipeline
- `buildCeoWorkspaceDataHeuristic(ventures)` — sync heuristic
- `CeoWorkspaceData` — unified view model for all panels
