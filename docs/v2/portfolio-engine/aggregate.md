# Portfolio Aggregate — Program 6110

## Responsibilities

- Add/remove ventures
- Change priority and lifecycle
- Assign budget and capabilities
- Pause/resume/archive/close ventures
- Register dependencies and shared assets
- Apply policies
- Protect invariants

## Invariants

| Rule | Enforcement |
|------|-------------|
| Venture belongs to one workspace | Validated on `AddVentureToPortfolio` |
| Cannot exceed max active ventures | Policy `MAX_ACTIVE_VENTURES` |
| Closed venture cannot run missions | `canStartMission()` |
| Paused venture blocks automatic tasks | `canStartAutomaticTasks()` |
| Allocations cannot exceed workspace limits | `allocateResource()` |
| Dependencies reference existing ventures | `addDependency()` |
| Circular dependencies rejected | DFS cycle detection |
| Shared assets need explicit consumer permissions | `approveSharedAssetUsage()` |

## File

`src/core/domain/portfolio/aggregate.ts`
