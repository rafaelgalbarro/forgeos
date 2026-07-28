# Portfolio Comparison

Query: `ComparePortfolioVentures`

Compares: stage, opportunity, evidence count, readiness, traction, economics, risk, confidence, cost to next milestone, expected time to milestone.

## Uncertainty

- `rankingDefinitive: false` always
- `uncertaintyFlags` per row (`NO_EVIDENCE`, `LOW_CONFIDENCE`, `MISSING_EVIDENCE`, `NO_ACTUAL_REVENUE`, …)
- comparison notes must be displayed with any UI

`GetPortfolioValueSummary` aggregates counts without inventing revenue (`venturesWithActualRevenue` only counts `ACTUAL`).
