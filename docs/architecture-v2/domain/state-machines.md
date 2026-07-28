# State machines — PROGRAM 6010

## Mission

`DRAFT → UNDERSTANDING → PLANNING → BUILDING → VALIDATING → READY_FOR_DEPLOY → OPERATING → EVOLVING → COMPLETED`

Side states: `PAUSED`, `BLOCKED` (requires `blockedReason`), `FAILED`. Terminal: `COMPLETED`, `FAILED`.

Mission **does not** invoke factories on transition.

## Decision

`PROPOSED → PENDING → APPROVED | REJECTED`

Also: `CANCELLED`, `SUPERSEDED` from non-terminal states. No reasoning field.

## Output

Aligned with Creation Output Studio:

`DRAFT → GENERATING → PREVIEW_READY → VALIDATING → APPROVED → EXPORT_READY → DEPLOYMENT_READY`

Branches: `CHANGES_REQUESTED`, `FAILED`.

## Build / Preview / Release / Deployment

| Aggregate | Happy path |
|-----------|------------|
| Build | `QUEUED → RUNNING → SUCCEEDED` |
| Preview | `PROVISIONING → READY → EXPIRED` |
| Release | `DRAFT → CANDIDATE → APPROVED → PUBLISHED` |
| Deployment | `REQUESTED → IN_PROGRESS → LIVE` |

## EvolutionProposal

`PROPOSED → UNDER_REVIEW → APPROVED | REJECTED | DEFERRED`

Domain records approval; it does **not** auto-apply changes.
