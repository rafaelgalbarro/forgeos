# PROGRAM 6150 — Multi-Company Operational Certification

End-to-end certification that ForgeOS can create multiple companies, run them concurrently, produce deliverables, allocate resources, measure value with provenance, isolate failures, and surface state — without inventing positive outcomes.

## Portfolio fixture

**RAFAEL VENTURES LAB** (generic fixture — not hardcoded in production engines)

| Venture | Role |
|---------|------|
| TABLEFLOW | Simultaneous build A |
| LUXORA EYEWEAR | Simultaneous build B |
| LOCALGROW AI | Simultaneous build C |
| CREATORPULSE | Validation |
| ORBITA SPORTS | Paused |

## How to run

Strict sequential pipeline (never parallel build + dev):

```bash
npm run kill:ports
npm run clean
npm run check:v2-boundaries
npm run test
npm run build
npm run reset:dev
```

Wait for readiness (`npm run wait:ready`), then:

```bash
npm run certify:multi-company
```

## Evidence

Written to `artifacts/certification/multi-company/`:

- `certification.json` / `certification.md`
- `portfolio-summary.json`, `ventures.json`, `executions.json`, `allocations.json`
- `value-snapshots.json`, `evidence.json`, `failures.json`, `releases.json`
- `screenshots/` (captured if present; otherwise documented)
- `final-report.md`

## Result semantics

| Result | Meaning |
|--------|---------|
| **CERTIFIED** | All acceptance criteria met with evidence; no remaining P0/P1 |
| **BLOCKED** | Scenario executed; P0/P1 prerequisites incomplete (e.g. 6130/6140 UI) |
| **FAILED** | Scenario or tests failed |

Declarations are only emitted with matching evidence. Never invent CERTIFIED.

## Docs in this folder

- [scenario.md](./scenario.md) — 20-step scenario
- [checklist.md](./checklist.md) — acceptance + test matrix
- [evidence-index.md](./evidence-index.md) — artifact map
- [final-report.md](./final-report.md) — copied from last cert run

## Integration

Reuses (does not duplicate):

- 6100 performance budgets / concurrency / isolation / request cache
- 6110 portfolio aggregate, projections, MultiVentureExecutor
- 6120 value entities, assessment, recommendations, in-memory store
- 6090 Company Command Center read model
- Composition root + delivery registries (canonical outputs/codebases)

Probes and reports gaps for:

- 6130 `/portfolio/[portfolioId]`
- 6140 AI Venture CEO V2
