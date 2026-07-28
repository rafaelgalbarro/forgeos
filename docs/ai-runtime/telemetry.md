# Telemetry (RC6)

Extended telemetry records per AI call:

- Provider, model, tokens (prompt/completion)
- Latency, cost, cache hits
- Fallbacks, errors, retries
- Confidence, department, capability, skill
- Streaming flag

## Storage

- RC3 base: `forgeos-ai-runtime-telemetry`
- RC6 extended: `forgeos-ai-runtime-telemetry-v2`

## API

```typescript
import { getTelemetrySummary, getExtendedTelemetry } from "@/lib/ai-runtime/telemetry/v2";
```
