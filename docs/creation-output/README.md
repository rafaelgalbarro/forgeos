# PROGRAM 5350 — Creation Output Studio

Make ForgeOS creation results visible and usable. Each mission produces visual OUTPUT users can open, navigate, test, review, compare, approve, export, and send to preview.

## Architecture

- **Mission Control** = progress only
- **Output Studio** (`/studio/[missionId]`) = created results
- **Adapters** transform factory outputs to common contract
- **No new business engines** — reuse via adapters only

## Modules

| Module | Path |
|--------|------|
| Types | `lib/creation-output/types.ts` |
| Registry | `lib/creation-output/output-registry.ts` |
| Repository | `lib/creation-output/output-repository.ts` |
| Builder | `lib/creation-output/output-builder.ts` |
| Validator | `lib/creation-output/output-validator.ts` |
| Versioning | `lib/creation-output/output-versioning.ts` |
| Change Requests | `lib/creation-output/change-requests.ts` |
| Adapters | `lib/creation-output/adapters/` |
| E2E NEXORA | `lib/creation-output/e2e-nexora-pipeline.ts` |
| Studio UI | `components/creation-output-studio/` |
| Route | `app/studio/[missionId]/` |

## Output Types

1. VENTURE_OUTPUT — Company Room
2. WEBSITE_OUTPUT — Navigable web preview
3. WEB_APPLICATION_OUTPUT — Functional demo app
4. MOBILE_APPLICATION_OUTPUT — Device frame preview
5. BACKEND_OUTPUT — Light technical view
6. DEPLOYMENT_OUTPUT — Dry-run deploy plan

## Access Points

- `/mission-control` — Resultados creados cards
- `/mission-control/[missionId]` — Toolbar → Output Studio
- `/missions/[missionId]` — Redirects to mission-control
- `/ventures/[slug]` — Output Studio link
- `/studio/[missionId]` — Full studio

## Preview Safety

All previews use `mock`, `sandbox`, `dry-run`, or `preview-plan` modes. No real production deploy, payments, emails, or tokens.

## E2E Validation

NEXORA FIELD case: `runNexoraFieldE2EPipeline()` generates all 6 output types via generic fixtures.

Studio URL: `/studio/mc-nexora-field-e2e-5350`

## Docs

- [output-contract.md](./output-contract.md)
- [output-studio.md](./output-studio.md)
- [adapters.md](./adapters.md)
- [versioning.md](./versioning.md)
- [change-requests.md](./change-requests.md)
- [preview-security.md](./preview-security.md)
- [e2e-nexora.md](./e2e-nexora.md)
