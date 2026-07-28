# Performance Baseline

PROGRAM 6100 establishes measured baselines before optimization.

## Metrics

| Metric | Description |
|--------|-------------|
| TTFB | Time to first byte per route |
| FCP/LCP | First/Largest Contentful Paint (route measurement) |
| JS size | Total `.next/static` JS bundle bytes |
| Requests | HTTP request count per route |
| Response sizes | HTML/JSON payload bytes |
| Queries per route | Segmented query count |
| Composition root time | Cold/warm init (ms) |
| Memory | heapUsed, rss (MB) |
| Query duration | Per-query execution time |
| Workflow duration | Orchestration timing |

## Routes Measured

- `/`
- `/mission-control`
- `/missions/[missionId]`
- `/company/[ventureId]`
- `/studio/[missionId]`
- `/studio/[missionId]/code`
- `/studio/[missionId]/preview`
- `/deployments`

## Artifacts

- `artifacts/performance/baseline.json` — initial baseline
- `artifacts/performance/report.json` — current measurement
- `artifacts/performance/routes.json` — route timings
- `artifacts/performance/bundles.json` — bundle sizes
- `artifacts/performance/queries.json` — query timings
- `artifacts/performance/memory.json` — memory snapshot
- `artifacts/performance/container.json` — composition root init
