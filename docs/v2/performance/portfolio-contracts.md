# Portfolio Contracts

Portfolio-ready types without Portfolio UI.

## VenturePortfolioCard

Light card with: ventureId, name, lifecycle, health, missionCount, activeMissions, lastActivityAt, activityStatus, valueStatus.

Value fields use UNKNOWN/NOT_MEASURED/INSUFFICIENT_EVIDENCE when data missing.

## ListPortfolioVentures

Paginated query with search, sorting, filters (lifecycle, health, activity, value status).

Validates 100 cards without loading 100 full dashboards.

Implementation: `src/core/performance/portfolio/`
