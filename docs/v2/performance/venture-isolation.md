# Venture Isolation

Isolation by: workspaceId, ventureId, missionId, projectId, sandboxId, executionId.

Applied in: queries, commands, artifacts, logs, previews, queues, caches, telemetry, storage.

## Guards

- `assertVentureAccess()` — throws IsolationViolationError
- `assertMissionAccess()` — mission + venture check
- `assertWorkspaceAccess()` — workspace check
- `canAccessArtifact()` — boolean check
- `scopeCacheKey()` — venture-scoped cache keys

## Tests

Venture A cannot access Venture B artifacts. Mission A cannot update Workflow B. Preview and cache isolation verified in `program-6100.test.ts`.
