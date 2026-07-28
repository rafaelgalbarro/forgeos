# Epic 6.8 — Release Manager (RC1 Capstone)

## Goal

Release Manager is the official capstone of Program 2 — Build Platform. It converts outputs from Build Context, Build DNA, Build Registry, and all factory modules (Frontend, Backend, Database, QA, Infrastructure) into a **release package** ready for stakeholder review.

It does **not** deploy, store real credentials, or execute real builds.

## Module

`lib/build-platform/release-manager/`

| File | Responsibility |
|------|----------------|
| `types.ts` | Release package, artifacts, gates, approvals, rollback types |
| `release-manager.ts` | Public API — `createReleaseManager()` |
| `release-builder.ts` | Orchestrates context, DNA, factories into a package |
| `release-artifacts.ts` | Collects factory blueprints and documentation |
| `release-versioning.ts` | Semantic versioning (major, minor, patch, prerelease, build metadata) |
| `quality-gates.ts` | Validates context, DNA, blueprints, and blocking risks |
| `approval-workflow.ts` | Release status states and approval steps |
| `rollback-plan.ts` | Rollback strategy, backups, steps, risk level |
| `release-notes.ts` | Summary, changes, risks, known issues, next steps |
| `release-checklist.ts` | Deployment checklist items |
| `release-timeline.ts` | Build → validate → review timeline events |
| `release-validator.ts` | Package-level validation |

## API

```ts
import { createReleaseManager } from "@/lib/build-platform/release-manager";

const manager = createReleaseManager();
const pkg = manager.buildReleasePackage({ venture });
```

## Release Package Structure

- `releaseId` — unique release identifier
- `ventureId` — source venture
- `version` — semantic version (`0.1.0-rc.1` initial)
- `status` — approval workflow state
- `createdAt` — ISO timestamp
- `artifacts` — frontend/backend/database blueprints, QA plan, infra spec, docs, env checklist
- `qualityGates` — pass/fail/warn gate results
- `approvals` — workflow state with role-based steps
- `rollbackPlan` — strategy, affected systems, backups, steps
- `releaseNotes` — human-readable release summary
- `deploymentChecklist` — preflight, deploy, post-deploy, rollback items
- `timeline` — phase events for lab display

## Quality Gates

1. Build Context valid
2. Build DNA valid
3. Frontend blueprint present
4. Backend blueprint present
5. Database blueprint present
6. QA checklist present
7. Infrastructure spec present
8. No blocking risks

## Approval Workflow States

`DRAFT` · `READY_FOR_REVIEW` · `APPROVED` · `BLOCKED` · `REJECTED` · `RELEASED` · `ROLLED_BACK`

Initial status is `READY_FOR_REVIEW` when all gates pass, otherwise `BLOCKED`.

## Constraints

- Specs/artifacts/validations only
- No modifications to Dashboard, Runtime, Research, or Product modules
- Direct imports from upstream build-platform modules
- FHIS components in lab UI

## Lab

Route: `/lab/release-manager`

Files:

- `app/lab/release-manager/page.tsx`
- `components/lab/ReleaseManagerLab.tsx`
- `lib/lab/release-manager-lab.ts`

Action button: **Generar Release Package**

## RC1 Milestone

Epic 6.8 completes Program 2 — Build Platform RC1, unifying Epics 6.0–6.7 into a single review-ready release artifact.
