# Tenancy and Security — Program 6110

- Workspace isolation enforced on every command/query via `canAccessWorkspace()`
- Portfolio must belong to requested workspace
- Ventures must belong to same workspace as portfolio
- No venture reads another's private data without approved `SharedAsset`
- Execution isolation context: `ws:{workspaceId}:ven:{ventureId}`
- Cache/projections keyed by `portfolioId`

Tests: `portfolio-engine.test.ts` — `enforces workspace isolation`
