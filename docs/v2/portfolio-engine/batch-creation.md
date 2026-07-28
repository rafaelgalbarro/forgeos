# Batch Venture Creation — Program 6110

`CreateVentureBatch` accepts 1 to configurable limit ventures.

Input: `workspaceId`, `portfolioId`, venture definitions, priorities, resource policies, `startMode` (`DRAFT_ONLY`, `CREATE_AND_PLAN`, `CREATE_AND_START`, `SCHEDULED`).

Each venture validated individually. Result per venture: `created` / `rejected` / `queued` / `blocked` with reason. No destructive global transaction if one fails.
