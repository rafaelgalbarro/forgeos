# Domain Duplication Map — PROGRAM 6000

**Date:** 2026-07-24  
**Method:** Grep/read of `type|interface|enum|class` definitions under `lib/`, `src/core/domain/`.  
**Finding:** Exact bare exports exist only for some names. Most concepts use specialized variants.

**Legend — Recommended contract:** freeze *runtime* contract now; V2 target lives under `src/core/domain` when complete (Program 6010), with legacy adapters (Program 6070).

---

## Mission

| | |
|--|--|
| **Files** | `lib/mission-control/types.ts` (`Mission`, `MissionSession`, coarse `MissionEvent`); `lib/mission-control/live-mission/types.ts` (rich `MissionEvent`, `MissionTask`); `lib/live-mission/types.ts` (UI views); `src/core/domain/mission/**` (entity/transitions stubs) |
| **Fields (runtime)** | Session: `missionId`, `workspaceId`, `founderId`, `intent`, `status`, `state`, `artifacts`, `events`, … — UI Mission adds messages/timeline/live panels |
| **Differences** | UI aggregate vs persistence session; two incompatible `MissionEvent.type` unions |
| **Consumers** | Mission Control UI, studio, multi-output, pair-founder |
| **Recommended contract** | Freeze `MissionSession` + `MissionSessionStatus` as runtime SoT; map UI `Mission` via adapter |
| **Legacy adapter candidate** | `missionToSession` / `lib/mission-control/mission-session.ts` → V2 Mission entity |

---

## Venture

| | |
|--|--|
| **Files** | `lib/domain/venture.ts` (`VentureProject`); `src/core/domain/venture/entity.ts` (`class Venture`); `lib/runtime/state-machine/types.ts` (`VentureState`); `lib/fos/lifecycle-engine`; portfolio cards |
| **Fields** | VentureProject: fat doc (PRD, intelligence, sections, `status: intelligence\|building\|ready`); V2 Venture: lean (`workspaceId`, `founderId`, `slug`, `IDEATION`…`ARCHIVED`) |
| **Differences** | Three+ status systems; name `Venture` only in `src` class |
| **Consumers** | Venture pages, persistence bridge, build/release, intelligence |
| **Recommended contract** | Freeze `VentureProject` as runtime SoT until adapter maps to V2 Venture |
| **Legacy adapter candidate** | `lib/persistence/bridges/venture-bridge.ts` |

---

## Project

| | |
|--|--|
| **Files** | No `interface Project`. `lib/project/types.ts` (`ProjectBundle`); `lib/code-generation/types.ts` (`CodeProject`); factory `*Project`; provider `SupabaseProject` / `VercelProject` |
| **Differences** | Venture document ≠ code project ≠ factory project ≠ cloud project |
| **Consumers** | Factories, code studio, project pages |
| **Recommended contract** | Do **not** invent unified `Project`; treat `CodeProject` as software-project runtime; keep factory projects namespaced |
| **Legacy adapter candidate** | Per-factory mappers → V2 Codebase/Output |

---

## Product

| | |
|--|--|
| **Files** | No bare `Product`. `lib/ai/types/product.ts` (`ProductPRD`); `lib/platform/product/types.ts` (`ProductSnapshot`); `ProductId` in `src/core/domain/shared/ids.ts` |
| **Differences** | PRD content vs pillar snapshot vs ID-only |
| **Consumers** | Embedded in `VentureProject.productPRD`; platform adapters |
| **Recommended contract** | Freeze `ProductPRD` as product *content*; V2 Product aggregate when 6010 complete |
| **Legacy adapter candidate** | Venture.productPRD → Product entity |

---

## Artifact

| | |
|--|--|
| **Files** | `MissionArtifact`, `BuildArtifact`, `ReleaseArtifactRef`, `SourceArtifactRef`, `ArtifactId` |
| **Differences** | Reference vs typed build artifact vs release blueprint bag |
| **Consumers** | Mission session, build-engine UI, release manager, creation-output |
| **Recommended contract** | Freeze typed refs; V2 Artifact as lineage node (6050) |
| **Legacy adapter candidate** | Mission/Build artifact → V2 Artifact |

---

## Output

| | |
|--|--|
| **Files** | `lib/creation-output/types.ts` (`CreationOutput`); `lib/multi-output/types.ts` (`PlannedOutput`); orchestration `*Output` payloads |
| **Fields** | `outputId`, `missionId`, `type`, `status`, `files`, `routes`, `approvals`, … |
| **Differences** | Deliverable SoT vs planning overlay vs orchestration DTOs |
| **Consumers** | Studio, multi-output, code-generation |
| **Recommended contract** | Freeze `CreationOutput` (PROGRAM 5350) as deliverable SoT |
| **Legacy adapter candidate** | `output-repository.ts` → V2 Output |

---

## Task

| | |
|--|--|
| **Files** | `SchedulerTask`, `QueueTask`, `MissionTask`, `TaskItem`, `TaskDefinition` |
| **Differences** | Scheduler (event-derived) vs queue (retry/execution) vs live UI Title-Case vs command-center DTO |
| **Consumers** | Runtime labs, live mission, persistence task repo |
| **Recommended contract** | Freeze `SchedulerTask` + `QueueTask` as runtime; UI tasks are projections |
| **Legacy adapter candidate** | MissionTask ↔ QueueTask status map |

---

## Job

| | |
|--|--|
| **Files** | `JobSpec` (backend-factory), `CiCdJobSpec` — **blueprint specs only** |
| **Differences** | Not a ForgeOS work-unit entity |
| **Recommended contract** | Keep as generated-spec types; do not promote to domain Job |
| **Legacy adapter candidate** | N/A (codegen) |

---

## Build

| | |
|--|--|
| **Files** | `BuildContext`, `BuildDna`, `BuildQueueItem`, `BuildPlan`, `BuildFlow*`, `BuildSnapshot`, preview `*Build*`, `BuildId` |
| **Differences** | Input context/DNA vs queue vs plan document vs sandbox build — no single `Build` aggregate in `lib/` |
| **Consumers** | Build platform labs, CEO build queue, preview runtime |
| **Recommended contract** | Freeze `BuildContext` + `BuildDna` as build *inputs*; V2 Build entity for execution instances |
| **Legacy adapter candidate** | BuildContext/real-build-flow → V2 Build |

---

## Release

| | |
|--|--|
| **Files** | `lib/programs/types.ts` (`Release`); `ReleasePackage` (release-manager); two different `ReleaseRecord` (delivery vs production-readiness); multi-output release package |
| **Differences** | Program governance vs venture software release vs ops record — colliding names + two `ReleaseStatus` unions |
| **Consumers** | Release manager lab, delivery, multi-output |
| **Recommended contract** | Freeze `ReleasePackage` for software release; rename/alias governance Release in V2 docs |
| **Legacy adapter candidate** | ReleasePackage → V2 Release |

---

## Deployment

| | |
|--|--|
| **Files** | No bare `Deployment`. `PreviewDeploymentRequest`/`Result`; `DeploymentSnapshot`; `DeploymentOutputPayload`; `DeploymentId` |
| **Differences** | Preview one-click vs cloud ops snapshot vs output payload |
| **Consumers** | `/deployments`, preview-deployment UI, creation-output |
| **Recommended contract** | Freeze preview-deployment request as preview SoT; cloud snapshot separate |
| **Legacy adapter candidate** | PreviewDeployment* → V2 Deployment |

---

## Decision

| | |
|--|--|
| **Files** | `lib/intelligence-layer/types.ts` (`Decision`); `MissionDecision` / `PendingDecision`; `DecisionRecord` (pair-founder); `BoardDecision`; `FosDecision`; `ForgeDecision` |
| **Differences** | Persisted intelligence decision vs mission UX vs board/FOS ephemeral |
| **Consumers** | Decision center, persistence `ICeoDecisionRepository`, board |
| **Recommended contract** | Freeze intelligence `Decision` as persisted SoT; mission decisions as session-local |
| **Legacy adapter candidate** | MissionDecision → Decision when promoted |

---

## Event

| | |
|--|--|
| **Files** | No bare `Event`. `DomainEvent` (`src/core/domain`); `RuntimeEvent`; dual `MissionEvent`; `PlatformEvent`; `FosEvent`; `WorkflowEvent`; timeline variants |
| **Differences** | Parallel buses/catalogs; unversioned envelopes |
| **Consumers** | Runtime, FOS bridges, live mission UI |
| **Recommended contract** | Freeze Runtime bus as operational SoT; V2 envelope (6040) wraps — **do not** add another bus (see freeze-rules) |
| **Legacy adapter candidate** | RuntimeEvent / MissionEvent → DomainEventEnvelope |

---

## User

| | |
|--|--|
| **Files** | No bare `User`. `AuthUser`, `StoredAuthUser` (+ passwordHash), `EnterpriseUser`, `Founder` (6010), `GitHubUser` |
| **Differences** | Auth identity vs enterprise RBAC vs Founder aggregate |
| **Consumers** | AuthProvider, workspace store, persistence user repo |
| **Recommended contract** | Freeze `AuthUser` for auth; Founder is V2 person-of-record when wired |
| **Legacy adapter candidate** | AuthUser → Founder |

---

## Workspace

| | |
|--|--|
| **Files** | `lib/workspace/types.ts` (`Workspace`); `src/core/domain/workspace/entity.ts` (class); `src/core/domain/workspace.ts` (second interface — **collision within src**); venture/ceo/company workspace snapshots |
| **Fields** | Runtime: `organizationId`, `ownerId`, `ventureIds`; V2 class: `ownerFounderId`, status, no org/venture arrays |
| **Differences** | Field and status model diverge |
| **Consumers** | Workspace service, auth, persistence |
| **Recommended contract** | Freeze `lib/workspace/types.ts` Workspace as runtime SoT |
| **Legacy adapter candidate** | workspace-bridge → V2 Workspace |

---

## Cross-cutting collision score

| Severity | Concepts |
|----------|----------|
| **Critical** | Mission (session/UI/events), Venture (3+ statuses), Workspace (3 defs), Event (parallel buses), Release (name collisions) |
| **High** | Task dialects, Decision layers, Output vs PlannedOutput |
| **Medium** | Artifact/Build/Deployment specialized variants |
| **Low / N/A** | Job (spec-only), Project (intentionally namespaced) |
