# E2E NEXORA FIELD Validation

NEXORA FIELD is a **validation case only** — no hardcoded motor logic.

## Pipeline

`lib/creation-output/e2e-nexora-pipeline.ts`

```ts
import { runNexoraFieldE2EPipeline } from "@/lib/creation-output";

const result = await runNexoraFieldE2EPipeline();
// result.allGenerated === true when all 6 types present
```

## Mission ID

`mc-nexora-field-e2e-5350`

## Studio URL

`/studio/mc-nexora-field-e2e-5350`

## Venture Fixture

Uses `lib/fixtures/nexora-field-venture.ts` via generic `fixture-registry`.

## Generic Entities

Technicians, incidents, routes, work orders, inventory, clients, budgets, billing, analytics — via `demo-fixtures.ts`, NOT hardcoded in adapters.

## Expected Outputs

1. VENTURE_OUTPUT — Company Room
2. WEBSITE_OUTPUT — 7 pages navigable
3. WEB_APPLICATION_OUTPUT — Scenario/Role selectors, demo flows
4. MOBILE_APPLICATION_OUTPUT — Device frames
5. BACKEND_OUTPUT — Entities, API, env plan
6. DEPLOYMENT_OUTPUT — DRY RUN cloud plan

## Disclaimer

"NEXORA FIELD es caso de validación E2E genérico. Fixtures y adapters reutilizan motores públicos sin lógica hardcoded."
