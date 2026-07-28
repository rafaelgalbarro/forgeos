# Idempotency (Program 6020)

Execution-style commands support:

- `meta.commandId`
- `meta.idempotencyKey` (preferred client key)
- `meta.correlationId`

`withIdempotency` stores JSON results in `IdempotencyStorePort`. Retries with the same key return the prior DTO and set `replayed: true` without re-mutating aggregates.

Use for: `CreateMission`, `GenerateOutput`, `GenerateCodebase`, `StartBuild`, `RetryBuild`, `CreatePreview`, `RequestDeployment`, `RollbackDeployment`.
