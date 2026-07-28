# Observability

Per-venture telemetry: executions, queue wait, duration, tokens, costs, errors, retries, build time, preview uptime, query latency, cache hit rate, memory, active resources.

## Internal View

`/lab/v2-performance` — route performance, slow queries, queue, executions, concurrency, previews, memory, cache, venture isolation, budgets.

## API

- `recordQueryLatency(ventureId, ms, cacheHit)`
- `recordExecution(ventureId, durationMs, error?)`
- `recordQueueWait(ventureId, waitMs)`
- `getVentureTelemetry(ventureId)`
- `getAllTelemetry()`

Implementation: `src/core/performance/observability/telemetry.ts`
