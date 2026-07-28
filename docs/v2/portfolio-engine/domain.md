# Domain Extensions — Program 6110

## New entities (no duplicates)

| Entity | Location | Notes |
|--------|----------|-------|
| `Portfolio` | `domain/portfolio/aggregate.ts` | Aggregate root |
| `PortfolioVenture` | `domain/portfolio/types.ts` | Venture membership in portfolio |
| `ResourceAllocation` | `domain/portfolio/types.ts` | Budget/worker/sandbox slots |
| `VenturePriority` | `domain/portfolio/types.ts` | CRITICAL → PAUSED |
| `VentureLifecycle` | `domain/portfolio/types.ts` | 17 canonical states |
| `VentureDependency` | `domain/portfolio/types.ts` | Cross-venture links |
| `SharedAsset` | `domain/portfolio/types.ts` | Controlled reuse |
| `SharedCapability` | `domain/portfolio/types.ts` | Capability grants |
| `PortfolioPolicy` | `domain/portfolio/types.ts` | Configurable limits |
| `PortfolioDecision` | `domain/portfolio/types.ts` | Audit decisions |
| `PortfolioExecutionSummary` | `domain/portfolio/types.ts` | Execution metrics |

## Reused (not duplicated)

`Workspace`, `Venture`, `Mission`, `Product`, `Output`, `Project`, `Release`, `Deployment` remain in their existing modules.

## Relations

```
Workspace
  └── Portfolio (1..n)
        ├── PortfolioVenture[] → Venture (by id)
        ├── ResourceAllocation[]
        ├── PortfolioPolicy[]
        ├── SharedAsset[]
        ├── VentureDependency[]
        └── PortfolioDecision[]
```

## IDs

New branded IDs in `domain/shared/ids.ts`: `PortfolioId`, `SharedAssetId`, `AllocationId`.
