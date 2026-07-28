# Telemetry & Observability

## Telemetry Panel

| Metric | Source |
|--------|--------|
| Provider / Model | runtime + observations |
| Latency | `result.latencyMs` |
| Tokens | sum `observations[].estimatedTokens` |
| Prompt/Completion tokens | estimated split 60/40 |
| Estimated Cost | sum `costEstimate` |
| Retries | warnings containing "retry" |
| Fallback | `result.fallbackUsed` |
| Warnings | `result.warnings` |
| Response Validator | OK / partial failure |

## Observability Panel (in-memory)

Session-scoped log via `observability-store.ts` — **no persistence** in Mission Control layer.

Each run registers:

- Task, Provider, Runtime source
- Session ID, Decision ID
- Latency, Cost, Confidence
- Errors, Warnings

Underlying executive observability (`lib/ai-orchestration/observability.ts`) still writes to localStorage for the runtime pipeline; Mission Control adds a separate in-memory view for the current browser session.

## Components

- `TelemetryPanel.tsx`
- `ObservabilityPanel.tsx`
- `observability-store.ts`
