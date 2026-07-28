# AI Runtime Integration — Read-Only Adapter

`lib/agents-marketplace/ai-runtime-adapter.ts` consumes **public exports only** from `lib/ai-runtime/`.

## What It Does

- `getAgentRuntimeHints(task, provider?)` — runtime status for detail panels
- `resolveRecommendedModelForTask(task)` — model lookup via model-registry
- `getMarketplaceTelemetrySummary()` — read-only telemetry
- `getMarketplaceExtendedTelemetry()` — read-only extended telemetry

## Public Imports Used

```typescript
// config (read-only flags)
isRealAiEnabled, isCostOptimizerEnabled, isMultiProviderRoutingEnabled

// model-registry (read-only lookups)
buildModelRegistrySnapshot, getBestModelForTask, getModelsForProvider

// telemetry (read-only)
getExtendedTelemetry, getTelemetrySummary
```

## What It Does NOT Do

- Call `runAIRuntime`, `completeViaAIRuntime`, or `streamAIRuntime`
- Modify routing, providers, or pipeline internals
- Write memory or decision graph entries

## Agent → AI Task Mapping

Each catalog agent declares an `aiTask` field used for model recommendations:

| Agent | aiTask |
|-------|--------|
| CEO | ceo-brief |
| CTO | build-architecture |
| Research | research |
| Legal | legal |
| Marketing / CMO | marketing |
| Developer / QA | code |
| Others | classification / strategy |

## Detail Panel Display

`AgentDetail` shows runtime hints:

- Real AI enabled (sandbox vs active)
- Provider configured
- Suggested model ID from registry
