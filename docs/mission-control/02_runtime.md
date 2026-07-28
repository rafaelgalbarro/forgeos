# Runtime & Brief Modules

## Executive Runtime Status

Displays live execution metadata:

| Field | Source |
|-------|--------|
| Estado | derived from loading/error/runtime |
| Provider | `result.provider` / `runtime.provider` |
| Modelo | `runtime.model` |
| Latencia | `result.latencyMs` |
| Coste estimado | sum of `observations[].costEstimate` |
| Fallback | `result.fallbackUsed` |
| Confianza | consensus or CEO brief confidence |
| Session ID | `runtime.boardSessionId` |
| Decision ID | `runtime.decisionId` |

## Executive Brief

Renders `CeoOutput` fields as readable prose:

- Executive Summary (`executiveSummary` or `summary`)
- Critical Risks (`criticalRisks` or `risks`)
- Growth Opportunities
- Recommended Action
- Expected Impact
- Confidence
- Time Horizon

"Ver respuesta técnica" expands full `CeoOutput` JSON.

## Execution Timeline

Phases: CEO → Board → Consensus → Decision → Memory → Finished

During `loading`, phases advance visually (simulated progress). On completion, all phases mark done (or error on failure).

## Orchestration

`lib/lab/executive-runtime-lab.ts` calls `runExecutiveIntelligence` with `createLabMockVenture()`. Safe without API keys — partial results on failure, never infinite loading.
