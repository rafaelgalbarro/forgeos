# Commands (Program 6020)

## Bus

`createCommandBus()` registers `CommandHandler`s by `commandType` and exposes `execute(command)`.

Compatible in spirit with Runtime event-bus handler registries — **not** a Runtime engine duplicate.

## Envelope

```ts
Command<TType, TPayload> = {
  type: TType;
  payload: TPayload;
  meta: { actorId, workspaceId?, commandId?, idempotencyKey?, correlationId?, issuedAt? }
}
```

## Initial commands

Workspace/Venture/Mission: `CreateWorkspace`, `CreateVenture`, `CreateMission`, `UpdateMissionIntent`, `ApproveMissionPlan`, `PauseMission`, `ResumeMission`, `CancelMission`

Decisions: `RequestDecision`, `ResolveDecision`

Outputs: `PlanOutput`, `GenerateOutput`, `RequestOutputChange`, `ApproveOutput`

Codebase: `GenerateCodebase`, `RequestCodeChange`, `ApproveCodebase`

Build/Preview: `StartBuild`, `StopBuild`, `RetryBuild`, `CreatePreview`, `StopPreview`

Release/Deploy: `CreateRelease`, `ApproveRelease`, `RequestDeployment`, `ApproveDeployment`, `RollbackDeployment`

## Handler rules

Validate identity → workspace access → policy → load aggregate → mutate → persist + events in UnitOfWork → DTO → telemetry.

Must not return entities with methods, import React, write localStorage, or hide failures.
