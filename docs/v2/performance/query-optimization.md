# Query Optimization

## Segmented Queries

| Query | Purpose |
|-------|---------|
| GetMissionCard | Light card for lists |
| GetMissionSummary | Card + optional outputs/workflow |
| GetMissionDetail | Full detail by section |
| GetVentureCard | Light venture card |
| GetVentureSummary | Venture overview |
| GetCompanyDashboard | Sectioned dashboard |
| GetCompanySectionDetail | Single section |
| GetOutputSummary | Paginated output list |
| GetOutputDetail | Single output (no content) |
| GetProjectSummary | File count, no contents |
| GetProjectManifest | Directory tree metadata |
| GetProjectFile | Single file on demand |
| ListPortfolioVentures | Paginated portfolio cards |

## Features

- Field selection support
- Cursor pagination
- Request-level cache deduplication
- Read model cache with TTL
- Event-based invalidation
- N+1 detection via segmented loading

Implementation: `src/core/performance/queries/handlers.ts`
