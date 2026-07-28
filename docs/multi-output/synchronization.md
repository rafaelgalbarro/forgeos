# Synchronization

Selective sync — NOT full regeneration on single decision change.

## Flow

1. `analyzeImpact(scenario)` — show affected outputs/files/risks/time/approval
2. Update shared context field
3. `syncAffectedOutputs()` — regenerate only affected creation-output types
4. Non-creation kinds (BRAND, GTM) sync from shared context without rebuild

## Documented Scenarios

| Scenario | Affected | Unaffected |
|----------|----------|------------|
| A: Pricing | Website, App, Investor, GTM | Backend (if schema unchanged) |
| B: Target customer | Venture, Website, GTM, Investor | Backend, Database |
| C: Remove mobile | Mobile only | All others |
| D: Add supervisor role | Backend, API, App, Database | Website, Brand |
| E: Visual identity | Brand, Website, App, Mobile, Investor, GTM | Backend, Database |
| F: Deploy provider | Deployment only | All product outputs |

## API

```typescript
import { syncAffectedOutputs, getSyncPreview } from "@/lib/multi-output";
const preview = getSyncPreview(session, "pricing");
const result = await syncAffectedOutputs(session, { scenario: "pricing" });
```
