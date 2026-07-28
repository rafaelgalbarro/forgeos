# PROGRAM 5390 — Multi-Output Mission

Single mission produces and keeps synchronized all deliverables: Venture, Brand, Website, Web App, Mobile, Backend, Database, API, Deployment, GTM, Investor, Operational assets.

## Architecture

- **lib/multi-output/** — Coordinator layer (adapters only, no new factories)
- Reuses: Mission Control, Creation Output Studio (5350), Code Generation (5360), Preview Runtime (5370), Preview Deployment (5380)
- **NEXORA FIELD** = validation only, no hardcoded motor logic

## Key Modules

| Module | Purpose |
|--------|---------|
| `types.ts` | Contracts: MultiOutputPlan, PlannedOutput, stages |
| `output-selector.ts` | Intent-based output selection (SaaS, restaurant, corporate, mobile) |
| `output-dependency-graph.ts` | Official dependency graph (single source of truth) |
| `shared-context.ts` | Shared entities: brand, pricing, API contracts, roles |
| `output-coordinator.ts` | Orchestration: context → assets → outputs → release |
| `output-sync.ts` | Selective sync on decision changes |
| `output-impact-analysis.ts` | Pre-change impact preview |

## Orchestration Order

```
UNDERSTAND → Select Outputs → Build Shared Context → Generate Shared Assets
→ Generate Outputs → Validate → Preview → Approve → Deploy Preview → Operate → Evolve
```

## UI Integration

- **Mission Control**: "Entregables de la misión" panel with status badges and CTA
- **Output Studio**: Tree map with dependencies, health, warnings

## E2E Validation

Mission ID: `mc-nexora-field-e2e-5390`

Routes:
- `/mission-control/mc-nexora-field-e2e-5390`
- `/studio/mc-nexora-field-e2e-5390`
- `/ventures/nexora-field`

## Verification

```bash
npm run kill:ports && npm run clean && npm run build && npm run reset:dev
```

See individual docs for dependency graph, sync scenarios, and failure isolation.
