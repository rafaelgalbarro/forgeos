# Portfolio Queries — Program 6110

`GetPortfolio`, `GetPortfolioSummary`, `ListPortfolioVentures`, `GetPortfolioVenture`, `GetPortfolioAllocations`, `GetPortfolioDependencies`, `GetSharedAssets`, `GetPortfolioPolicies`, `GetPortfolioDecisions`, `GetPortfolioActivity`, `GetPortfolioCapacity`, `GetPortfolioRisks`

## ListPortfolioVentures

Supports pagination, search, sorting, lifecycle/priority/health filters, blockers, active executions. Returns lightweight `VenturePortfolioCard[]` — no full dashboards.

## Handler

`src/core/application/portfolio/service.ts` — `PortfolioService.executeQuery()`
