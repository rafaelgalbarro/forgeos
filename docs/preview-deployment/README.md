# PROGRAM 5380 — One-Click Preview Deployment

Allow validated Sandbox Preview Runtime projects to publish as remote preview via a single approved action.

## Flow

```
Code Project → Static Validation → Sandbox Build → QA Gates → Approval
  → Repository → Preview Deployment → Health Check → Preview URL → Audit → Rollback
```

## Critical Rules

- NO production, NO real DNS, NO definitive domains
- NO deploy without approval
- NO secrets exposed in repository push
- NO deploy for projects that haven't passed sandbox (5370)
- Dry-run when flags/credentials disabled — NEVER invent remote URLs

## Entry Points

| Route | Purpose |
|-------|---------|
| `/studio/[missionId]` | Output Studio — "Publicar Preview" panel |
| `/deployments` | Unified deployment history |
| `/lab/preview-deployment` | Engineering harness |

## Module

`lib/preview-deployment/` — orchestrator, validator, planner, runner, health, audit, store.

## Related Programs

- **5360** — CodeProject (`lib/code-generation/`)
- **5370** — Sandbox Preview Runtime (`lib/preview-runtime/`)
- **5350** — Creation Output Studio (`lib/creation-output/`)
- **4300** — Cloud Foundation adapters (`lib/cloud-foundation/preview-adapters.ts`)
