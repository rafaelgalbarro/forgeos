# Output Contract

PROGRAM 5350 defines `CreationOutput` in `lib/creation-output/types.ts`.

## Types

- `VENTURE_OUTPUT`
- `WEBSITE_OUTPUT`
- `WEB_APPLICATION_OUTPUT`
- `MOBILE_APPLICATION_OUTPUT`
- `BACKEND_OUTPUT`
- `DEPLOYMENT_OUTPUT`

## Core Fields

| Field | Description |
|-------|-------------|
| `outputId` | Unique identifier |
| `missionId` | Parent mission |
| `ventureId` | Optional venture link |
| `type` | Output type enum |
| `title` | Display title |
| `status` | Lifecycle status |
| `version` | Semver string |
| `previewMode` | Safety mode |
| `previewUrl` | Only sandbox URLs if any |
| `files` | Export file tree |
| `routes` | Navigable routes |
| `validation` | Score and checks |
| `approvals` | Approval records |
| `payload` | Type-specific data |

## Statuses

`DRAFT` → `GENERATING` → `PREVIEW_READY` → `VALIDATING` → `CHANGES_REQUESTED` → `APPROVED` → `EXPORT_READY` → `DEPLOYMENT_READY` → `FAILED`

## Preview Modes

- `mock` — Static demo data
- `sandbox` — Isolated preview environment
- `dry-run` — Plan only, no execution
- `preview-plan` — Documented plan (e.g. Expo, Vercel)
- `unavailable` — No preview possible
