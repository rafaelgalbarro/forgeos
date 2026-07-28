# Output Registry V2

Canonical product outputs. Migrated from Creation Output (PROGRAM 5350) via **non-destructive adapters**.

## Kinds (adapters required)

- `VENTURE_OUTPUT`
- `WEBSITE_OUTPUT`
- `WEB_APPLICATION_OUTPUT`
- `MOBILE_APPLICATION_OUTPUT`
- `BACKEND_OUTPUT`
- `DEPLOYMENT_OUTPUT`

## Adapter

`src/core/delivery/output/adapters.ts` → `adaptCreationOutput` / per-kind helpers.

Legacy `lib/creation-output` remains source of truth for Studio UI until fully cut over.
