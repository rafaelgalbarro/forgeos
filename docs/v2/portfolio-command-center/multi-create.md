# Multi-create flow

`MultiCreateFlow` provides 8-step wizard framing:
1. Define objectives
2. Add ideas
3. Select venture count
4. Configure priority
5. Configure resources
6. Choose start mode
7. Review impact
8. Create portfolio batch

Execution command:
- Server action `createPortfolioBatchAction`
- Calls portfolio command `CreateVentureBatch` (Program 6110)
- Renders per-company result status (`created`, `rejected`, `queued`, `blocked`)
