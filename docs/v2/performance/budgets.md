# Performance Budgets

Defined in `src/core/performance/config/budgets.ts`.

| Budget | Target |
|--------|--------|
| Initial navigation (local) | < 2.5s |
| Cached read model | < 300ms |
| Dashboard payload | < 250KB JSON |
| JS reduction from baseline | 30% |
| Heavy factories in client | None |
| Unlimited lists | None |
| Max preview sandboxes | 3 (configurable) |
| Max workflows per venture | 5 (configurable) |
| Portfolio cards per page | 50 max |

## Regression Tolerances

| Metric | Tolerance |
|--------|-----------|
| Route latency | 15% |
| Bundle size | 10% |
| Query latency | 20% |
| Payload size | 15% |
| Memory | 25% |

Run `npm run check:performance-budgets` to compare current vs baseline. Non-zero exit on critical regressions.
