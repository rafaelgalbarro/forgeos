# PROGRAM 6100 — Performance & Scalability Foundation

ForgeOS V2 performance foundation for multi-venture scalability without Portfolio UI, new factories, or duplicate runtime infrastructure.

## Scope

- Performance baseline measurement (routes, bundles, queries, memory, composition root)
- Performance budgets with regression detection
- Server-first rendering strategy
- Lazy composition root services
- Segmented queries with caching
- Read model projections
- Three-level cache (request, read model, artifact metadata)
- Multi-venture resource isolation
- Execution queue load planning (reuses existing Runtime/Scheduler)
- Concurrency control with configurable limits
- Background job patterns
- Event stream optimization
- List virtualization preparation
- Asset/image optimization contracts
- Code explorer on-demand loading
- Preview lifecycle management
- Performance UI patterns
- Portfolio-ready contracts (no UI)
- Multi-venture simulation fixtures
- Value-ready data fields
- Observability (`/lab/v2-performance`)

## Scripts

```bash
npm run measure:routes
npm run measure:bundles
npm run measure:queries
npm run measure:memory
npm run measure:container
npm run measure:performance
npm run check:performance-budgets
npm run test:6100
```

## Sequential Validation

```bash
npm run kill:ports
npm run clean
npm run check:v2-boundaries
npm test
npm run build
npm run reset:dev
```

## Key Modules

- `src/core/performance/` — cache, projections, queries, isolation, concurrency, queue, preview lifecycle
- `scripts/performance/` — measurement scripts
- `artifacts/performance/baseline.json` — performance baseline
- `docs/v2/performance/` — documentation
