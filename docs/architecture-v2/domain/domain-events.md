# Domain events — PROGRAM 6010

Every event includes:

`eventId`, `eventType`, `version`, `aggregateId`, `workspaceId`, `occurredAt`, `actor`, `correlationId?`, `causationId?`, `payload`

## Catalog

| eventType | Typical aggregate |
|-----------|-------------------|
| WorkspaceCreated | Workspace |
| WorkspaceUpdated | Workspace |
| VentureCreated | Venture |
| VentureStatusChanged | Venture |
| MissionCreated | Mission |
| MissionStatusChanged | Mission |
| DecisionProposed | Decision |
| DecisionResolved | Decision |
| ArtifactCreated | Artifact |
| ProductCreated | Product |
| OutputCreated | Output |
| OutputStatusChanged | Output |
| CodebaseCreated | Codebase |
| BuildRequested | Build |
| BuildCompleted | Build |
| PreviewCreated | Preview |
| ReleasePrepared | Release |
| ReleasePublished | Release |
| DeploymentRequested | Deployment |
| DeploymentCompleted | Deployment |
| OperationRecorded | Operation |
| EvolutionProposed | EvolutionProposal |

Factory: `createDomainEvent()` in `src/core/domain/events/`.
