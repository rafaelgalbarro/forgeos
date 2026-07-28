# Read model

Location: `src/core/application/portfolio-command-center/`.

Inputs:
- `root.store.meta.portfolio6150.readModel` (Program 6110/6150 portfolio projection)
- `root.store.previews`, `root.store.releases`, `root.store.missions`
- `root.store.meta.valueComparison` when available (Program 6120 compare output)

Outputs:
- `PortfolioCommandCenterReadModel` with quick-view metrics, venture cards, execution/value/resource boards, alerts, approvals, risks, activity, and pagination.

Notes:
- No synthetic business numbers are invented.
- Unknown value/cost fields remain `UNKNOWN` when source data is missing.
