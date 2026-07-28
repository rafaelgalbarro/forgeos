# E2E Results — PROGRAM 6080

**Source:** [`e2e-evidence.json`](./e2e-evidence.json)  
**Fixture:** [`fixtures/cert-6080-mission.json`](./fixtures/cert-6080-mission.json)  
**Mission ID:** `mission-cert-6080-aurora-ops` (generic; not NEXORA-specific motor)

## Requested outputs (fixture)

COMPANY_CREATION · BRAND · WEBSITE · WEB_APP · BACKEND · DATABASE · PREVIEW · RELEASE · PREVIEW_DEPLOYMENT · OPERATIONAL_PLAN

## Flow validation matrix

| Step | Status | Evidence | Markers |
|------|--------|----------|---------|
| Intent | PARTIAL | `lib/mission-control/intention-engine.ts`, fixture | HEURISTIC (keyword classify) |
| Mission | PARTIAL | `mission-session.ts`, `src/presentation/actions/create-mission-action.ts`, fixture | HEURISTIC |
| Decisions | PARTIAL | `lib/mission-control/decision-center.ts` | seeded / heuristic (5150 gaps) |
| Plan | PARTIAL | `src/core/orchestration/planning/mission-execution-plan.ts` | DRY_RUN, ESTIMATED |
| Artifacts | PARTIAL | `src/core/delivery/artifact/registry.ts` | DRY_RUN (in-memory) |
| Outputs | PARTIAL | delivery output registry + `lib/creation-output` | dual surface |
| Codebases | PARTIAL | delivery codebase registry + `lib/code-generation` | — |
| Builds | PARTIAL | delivery build registry; product `npm run build` FAIL | — |
| Previews | PARTIAL | `lib/preview-runtime`, `/studio/.../preview` | smoke NOT_RUN |
| Release | PARTIAL | CanonicalRelease types; release-manager stubs | STUB |
| Preview Deployment | PARTIAL | `lib/preview-deployment/config.ts` | DRY_RUN default |
| Company OS | PARTIAL | `app/company`, `src/presentation`, `/os` | flags OFF |
| Change Request | PARTIAL | `lib/creation-output/change-requests.ts`, delivery change-impact | — |
| Impact Analysis | PARTIAL | `lib/multi-output/output-impact-analysis.ts` | HEURISTIC, ESTIMATED (scenario map) |
| New Version | PARTIAL | `output-versioning.ts` | loop not live-tested |
| New Build | PARTIAL | build registry | NOT_AUTOMATED |
| Updated Preview | PARTIAL | preview-runtime / studio | NOT_AUTOMATED |

**Summary counts (script):** PASS=0 · FAIL=1 · PARTIAL=17 · SKIPPED=0  
FAIL step: `application_ports_split` (6020 export coherence; evidenced by product build type error). Additional CRITICAL blockers from build procedure remain outside the flow table.

## Data lineage

| Item | Status |
|------|--------|
| `VersionLineage` type | EXISTS — `src/core/delivery/types.ts` |
| `buildVersionLineage` | EXISTS — `src/core/delivery/lineage/version-graph.ts` |
| In-memory E2E fixture `runDeliveryPipelineE2E` | EXISTS — DRY_RUN / not live remote |
| Live lineage for Aurora Ops mission | NOT DEMONSTRATED |

Documented link chain (contract-level):

1. Artifact → Output (`sourceArtifactIds`)  
2. Output → Codebase (`outputId` / `sourceArtifactIds`)  
3. Codebase → Build (`codebaseId`)  
4. Build → Preview (`buildId`)  
5. Preview/Outputs/Builds → Release  
6. Release → Deployment (`releaseId`; dry-run must remain `dryRun: true`)

## UX path checklist (routes exist; live HTTP not verified)

| Route | Purpose | Live verified |
|-------|---------|---------------|
| `/mission-control` | Start mission | NO |
| `/mission-control/[missionId]` | Decisions / progress | NO |
| `/studio/[missionId]` | See creations | NO |
| `/studio/[missionId]/preview` | Try preview | NO |
| `/studio/[missionId]/code` | Code / versions | NO |
| `/company` | Company overview | NO |
| `/os/creator` | Creator without Factory lab | NO |
| `/deployments` | Preview publish history | NO |

## Delivery fixture attempt

Default certification run: **SKIPPED** (`FORGEOS_CERT_TRY_TSX` unset).  
Optional: `node scripts/run-v2-certification.js --with-tsx` attempts `npx tsx src/core/delivery/__tests__/delivery-model-6050.test.ts`.

## Build procedure (sequential evidence)

See [`build-procedure-evidence.json`](./build-procedure-evidence.json):

| Step | Status |
|------|--------|
| kill:ports | PASS (zombie PIDs still noted) |
| clean | PASS |
| architecture:check | MISSING |
| typecheck (`npx tsc --noEmit`) | FAIL |
| test | MISSING |
| build | FAIL |
| reset:dev / smoke | NOT_RUN |
