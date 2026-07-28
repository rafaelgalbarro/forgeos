# Memory System

## Venture Memory

Each venture is converted into a `VentureMemoryRecord` containing knowledge snapshots (not just document text):

| Field | Source |
|-------|--------|
| `initialIdea` | `venture.ideaText` |
| `discoveryAnswers` | `venture.discoveryAnswers` |
| `discoveryContext` | `venture.discoveryContext` |
| `researchSummary` | Truncated `researchReport.marketSummary` |
| `simulatorResult` | `venture.ventureSimulatorResult` |
| `productPRDMeta` | `venture.productMeta` |
| `hasBuildPlan` | Engineering sections with content |
| `assumptions` | Business model, CAC, conversion from simulator |
| `risks` | Simulator risks + pending discovery questions |
| `results` | Score, recommendation, intelligence acceptance |
| `changes` | `updatedAt` deltas between syncs |

### Functions

- `buildVentureMemory(venture)` — pure transform
- `syncVentureMemory(venture)` — upsert + auto-decisions + learning + history

## Portfolio Memory

`buildPortfolioMemory(ventures)` aggregates:

- Total ventures and IDs
- Aggregated risks and opportunities
- Detected patterns
- Generated insights

Stored in `forgeos-intelligence-portfolio`.

## CEO Memory

Structure-only storage for future AI CEO integration:

- Briefings, priorities, results, stored recommendations
- Key: `forgeos-intelligence-ceo-memory`

## Knowledge Evolution

Wrapper (`knowledge-evolution.ts`) adds metadata to catalog entries:

- Version, category, priority, origin, validity window
- Venture linkage without modifying `lib/knowledge/` core files
