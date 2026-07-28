# NEXORA FIELD E2E — Multi-Output

Validation-only fixture. No hardcoded motor logic.

## Mission

- ID: `mc-nexora-field-e2e-5390`
- Venture: `nexora-field`
- Idea: Field service management platform

## Expected Deliverables

≥8 active outputs for SaaS profile:
venture, brand, website, webapp, backend, database, api, deployment, gtm, investor (+ optional mobile, operational)

## Sync Tests

- Pricing change → selective sync
- Add supervisor role → backend/API/app affected

## Routes

| Route | Purpose |
|-------|---------|
| `/` | Home |
| `/mission-control` | MC list |
| `/mission-control/mc-nexora-field-e2e-5390` | MC mission |
| `/studio/mc-nexora-field-e2e-5390` | Output Studio tree |
| `/ventures/nexora-field` | Venture page |
| `/deployments` | Deploy previews |

## Run

```typescript
import { runNexoraMultiOutputE2E } from "@/lib/multi-output";
const result = await runNexoraMultiOutputE2E();
// result.allDeliverablesGenerated === true
// result.syncTests.length === 2
```

## Metrics

- `durationMs` — total pipeline time
- `syncTests` — regeneration counts per scenario
- `releaseVersion` — coordinated 0.1.0
