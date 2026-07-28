# Read Model Projections

Event-updated projections with version, freshness, and rebuild capability.

| Projection | Source Events |
|------------|---------------|
| MissionCardProjection | MissionSummaryChanged |
| VentureCardProjection | VentureCardChanged |
| CompanyHealthProjection | CompanyHealthChanged |
| OutputStatusProjection | OutputStatusChanged |
| PortfolioSummaryProjection | VentureCardChanged, MissionSummaryChanged |
| WorkflowProgressProjection | WorkflowProgressChanged |
| ReleaseStatusProjection | ReleaseStatusChanged |

STALE projections are marked when outdated and invalidated by events.

Store: `src/core/performance/projections/projection-store.ts`
