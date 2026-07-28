# Portfolio Commands — Program 6110

All commands validate workspace, permissions, idempotency (via pipeline), generate events, persist, and update projections.

## Core commands

`CreatePortfolio`, `AddVentureToPortfolio`, `RemoveVentureFromPortfolio`, `SetVenturePriority`, `SetVentureLifecycle`, `PauseVenture`, `ResumeVenture`, `ArchiveVenture`, `CloseVenture`, `AllocateBudget`, `AllocateCapability`, `ReleaseAllocation`, `CreateVentureDependency`, `RemoveVentureDependency`, `RegisterSharedAsset`, `ApproveSharedAssetUsage`, `CreatePortfolioPolicy`, `UpdatePortfolioPolicy`, `RecordPortfolioDecision`

## Batch commands

`CreateVentureBatch`, `PauseVentureBatch`, `ResumeVentureBatch`, `ChangePriorityBatch`, `ArchiveVentureBatch`, `RequestPortfolioReview`, `SchedulePortfolioBuilds`

## Handler

`src/core/application/portfolio/service.ts` — `PortfolioService.executeCommand()`
