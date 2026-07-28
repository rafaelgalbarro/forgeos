# Program 6110 — Multi-Venture Portfolio Engine

Evolve ForgeOS V2 from single-venture creation to simultaneous multi-venture portfolio management within a workspace.

## Scope

- Portfolio aggregate with venture lifecycle, priorities, allocations, policies, shared assets, dependencies
- CQRS commands and queries
- Incremental projections and `PortfolioReadModel`
- Multi-venture execution with fairness and failure isolation
- Batch venture creation and batch operations
- Certification fixture: **RAFAEL VENTURES LAB** (5 ventures)

## Out of scope (this program)

- Portfolio Command Center dashboard UI
- New Workflow Engine or Scheduler
- Program 6120

## Key paths

| Layer | Path |
|-------|------|
| Domain | `src/core/domain/portfolio/` |
| Application | `src/core/application/portfolio/` |
| Fixture | `src/core/composition/fixtures/rafael-ventures-lab.ts` |
| Tests | `src/core/application/portfolio/__tests__/portfolio-engine.test.ts` |

## Verification

```bash
npm run kill:ports
npm run clean
npm run check:v2-boundaries
npm test
npm run build
npm run reset:dev
```

## Documentation index

- [domain.md](./domain.md)
- [aggregate.md](./aggregate.md)
- [lifecycle.md](./lifecycle.md)
- [commands.md](./commands.md)
- [queries.md](./queries.md)
- [events.md](./events.md)
- [priorities.md](./priorities.md)
- [allocations.md](./allocations.md)
- [policies.md](./policies.md)
- [shared-assets.md](./shared-assets.md)
- [dependencies.md](./dependencies.md)
- [projections.md](./projections.md)
- [batch-creation.md](./batch-creation.md)
- [tenancy.md](./tenancy.md)
- [certification.md](./certification.md)
- [final-report.md](./final-report.md)
