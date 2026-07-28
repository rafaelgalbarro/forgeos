# Forge Intelligence Layer — Architecture

Release 0.5 introduces a **heuristic intelligence layer** that accumulates venture knowledge, decisions, patterns, and learnings without new AI or external APIs.

## Overview

```
VentureProject (forgeos-ventures)
        │
        ▼
┌───────────────────┐
│  Venture Memory   │──► localStorage: forgeos-intelligence-venture-memory
└─────────┬─────────┘
          │
    ┌─────┴─────┬─────────────┬──────────────┐
    ▼           ▼             ▼              ▼
Decision    Timeline     Learning      Pattern Engine
 Engine                    Engine
    │           │             │              │
    └─────┬─────┴─────────────┴──────────────┘
          ▼
   Portfolio Memory ──► Insights + Recommendations
          │
          ▼
     CEO Memory (structure only)
```

## Modules

| Module | Path | Responsibility |
|--------|------|----------------|
| Venture Memory | `venture-memory/` | Snapshot venture state into persistent memory |
| Decision Engine | `decision-engine/` | Register, list, update strategic decisions |
| Timeline | `timeline/` | Build phase timeline (Idea → Growth) |
| Pattern Engine | `pattern-engine/` | Heuristic pattern detection across portfolio |
| Learning Engine | `learning-engine/` | Lessons, best practices, mistakes |
| Portfolio Memory | `portfolio-memory/` | Aggregate all ventures |
| Insights | `insights/` | Portfolio-level insight strings |
| Recommendations | `recommendations/` | Per-venture strategic suggestions |
| CEO Memory | `ceo-memory/` | Briefings/priorities structure (no generation) |
| Knowledge Evolution | `knowledge-evolution.ts` | Metadata wrapper over knowledge catalog |

## Storage

All persistence uses **separate localStorage keys** — never modifies `forgeos-ventures`.

## UI Integration

- New nav item **Memoria** in Venture Workspace (`VentureMemoryPanel`)
- FHIS components only (`@/components/ui/fhis/*`)
- Sync on panel mount via `syncVentureMemory(venture)`

## Constraints

- No new npm dependencies
- No FOS/CEO/Board imports
- No modifications to Dashboard, portfolio logic, or core business engines
- Heuristics only — no LLM calls
