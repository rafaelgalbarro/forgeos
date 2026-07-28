# ForgeOS AI Runtime RC6

Real AI Execution Platform — unified pipeline for all AI calls in ForgeOS.

## Pipeline

```
Executive Mesh → AI Runtime → Prompt Compiler v2 → Context Engine v2
→ Model Router v2 → Provider Adapter → Telemetry → Memory → Decision Graph → Executive Response
```

## Feature Flags

| Variable | Default | Description |
|----------|---------|-------------|
| `ENABLE_REAL_AI` | `false` | When false, mock/simulation paths unchanged |
| `ENABLE_STREAMING` | `true` | Progressive response streaming |
| `ENABLE_MULTI_PROVIDER_ROUTING` | `true` | Auto-routing across providers |
| `ENABLE_COST_OPTIMIZER` | `true` | Budget-aware model selection |

## Entry Points

- `runAIRuntime()` — main pipeline
- `completeViaAIRuntime()` — drop-in for gateway calls
- `streamAIRuntime()` — streaming generator
- `/api/ai/run` — HTTP API

## Architecture

All business modules call AI via adapters — never direct provider SDKs.
See individual docs for providers, routing, compiler, context, telemetry, streaming, security.
