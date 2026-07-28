# Portfolio Projections — Program 6110

Incremental updates via `applyPortfolioEvent()` — no full recalc per query.

| Projection | Builder |
|------------|---------|
| `PortfolioSummaryProjection` | `buildPortfolioSummary()` |
| `PortfolioVentureCardProjection` | `buildVentureCard()`, `listVentureCards()` |
| `PortfolioCapacityProjection` | `buildCapacityViews()` |
| `PortfolioRiskProjection` | `buildRiskViews()` |
| `PortfolioActivityProjection` | `applyPortfolioEvent()` activity feed |
| `PortfolioAllocationProjection` | read model allocations slice |
| `PortfolioDependencyProjection` | read model dependencies slice |

File: `src/core/application/portfolio/projections.ts`
