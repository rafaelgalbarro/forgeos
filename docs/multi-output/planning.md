# Multi-Output Planning

## Flow

1. **UNDERSTAND** — Mission session captures intent via conversation
2. **SELECT_OUTPUTS** — `output-selector.ts` decides required/optional/excluded
3. User can **accept** or **modify** plan via Mission Control
4. Plan stored in memory store keyed by `missionId`

## Intent Profiles

| Pattern | Required Outputs | Excluded |
|---------|-----------------|----------|
| SaaS | venture, brand, website, webapp, backend, db, api, deploy, gtm, investor | — |
| Restaurant | venture, brand, website | mobile, api, investor |
| Corporate Web | brand, website, deploy | backend, mobile, api |
| Mobile App | mobile, backend, db, api, website (landing) | — |

## Plan Fields

- `estimatedMinutes` / `estimatedCostEur` — aggregated from per-output estimates
- `monorepoRecommended` — when ≥6 active outputs
- `excludedReasons` — why each excluded output was skipped

## API

```typescript
import { createMultiOutputPlan, acceptPlan, modifyPlanOutputs } from "@/lib/multi-output";
```
