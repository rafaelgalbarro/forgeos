# PROGRAM 5150 — Mission Contract

## Core Types (`lib/mission-control/types.ts`)

### MissionSessionStatus

```
DRAFT | UNDERSTANDING | PLANNING | BUILDING | VALIDATING |
READY_FOR_DEPLOY | OPERATING | EVOLVING | PAUSED | BLOCKED |
COMPLETED | FAILED
```

### MissionIntent

```ts
interface MissionIntent {
  primary: IntentionType;
  secondary?: IntentionType[];
  confidence: number;
  extractedIdea?: string;
  clarifyingQuestion?: string;
  ceoRationale?: {
    ventureFirst?: string;
    webApp?: string;
    publicWebsite?: string;
    mobileTiming?: string;
  };
}
```

### MissionSession (persistence contract)

| Field | Type | Description |
|-------|------|-------------|
| missionId | string | Unique mission ID |
| workspaceId | string | Workspace scope |
| ventureId | string? | Linked venture/project |
| ventureSlug | string? | Venture page slug |
| founderId | string | Founder identity |
| intent | MissionIntent \| null | Classified intention |
| currentStage | MissionPhase | Official phase |
| status | MissionSessionStatus | Session status |
| state | MissionState | Phase completion flags |
| conversation | MissionMessage[] | Chat history |
| decisions | MissionDecision[] | Decision log |
| artifacts | MissionArtifact[] | Generated artifacts |
| events | MissionEvent[] | Timeline events |
| pendingApprovals | MissionDecision[] | Gates awaiting approval |
| activeDepartments | string[] | Active exec departments |
| planStages | MissionStage[]? | PLAN phase stages |
| validationScores | MissionValidationScores? | VALIDATE scores |
| createdAt / updatedAt | ISO string | Timestamps |

### MissionStage (PLAN item)

Each stage includes: `id`, `label`, `phase`, `owner`, `department`, `dependencies`, `status`, `expectedResult`, `estimatedMinutes`, `approvalRequired`.

### MissionArtifact

Types: `plan | preview | score | deployment | report | build`. Source: `demo | heuristic | real`.

### MissionValidationScores

Dimensions: Venture, Product, Technical, Market, Risk, MVP Readiness, Launch Readiness, Investor Readiness.

### MissionHistory

Append-only entries: `{ id, timestamp, action, phase, sessionStatus, detail? }`.

## Repository Pattern

- **Interface**: `MissionRepository` in `mission-repository.ts`
- **Adapter**: `LocalStorageMissionRepository` (localStorage only in repository layer)
- **Bridge**: `missionToSession()` / `sessionToMission()` map legacy `Mission` type

## Phase Mapping

| MissionPhase | MissionSessionStatus |
|--------------|---------------------|
| UNDERSTAND | UNDERSTANDING |
| PLAN | PLANNING |
| BUILD | BUILDING |
| VALIDATE | VALIDATING |
| DEPLOY | READY_FOR_DEPLOY |
| OPERATE | OPERATING |
| EVOLVE | EVOLVING |

## Conversation Rules

- One decision per CEO message
- Brief Spanish tone
- No fixed questionnaire — topics spread across conversation
- Minimum topics: target client, region, revenue model, user profile, critical problem, priority integration, MVP goal

## Reused Engines (adapters only)

- Website Factory, Application Factory, Mobile Factory
- Build Context, Build DNA, Build Pipeline
- Venture Intelligence, Architecture Review, Self Evolution
- Cloud Foundation, Production Readiness
- GTM, Investor Mode, Digital CEO, Autonomous Company

No new engines created.
