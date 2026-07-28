# Evidence System

**Rule:** no evidence without origin (`source` + `provenance`).

## Types

`RESEARCH_SOURCE`, `CUSTOMER_INTERVIEW`, `SURVEY`, `WAITLIST`, `LANDING_CONVERSION`, `DEMO_REQUEST`, `LETTER_OF_INTENT`, `PILOT`, `ACTIVE_USER`, `PAYING_CUSTOMER`, `REVENUE_EVENT`, `RETENTION_EVENT`, `COST_EVENT`, `EXPERIMENT_RESULT`, `OPERATIONAL_RESULT`, `EXTERNAL_VALIDATION`

## Fields

- source, date (`observedAt`), reliability, direct/inferred (`derivation`)
- related hypothesis, affected metric
- provenance, attachment/artifact refs
- verification status (`UNVERIFIED` → `VERIFIED` / `REJECTED`)

Command: `RegisterValueEvidence`.
