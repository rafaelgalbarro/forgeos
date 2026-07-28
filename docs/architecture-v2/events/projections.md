# Projections

Light, rebuildable read models in `src/core/events/projections/`:

| Projection | Use |
|------------|-----|
| MissionTimelineProjection | Mission timeline UI |
| MissionActivityProjection | Live Mission activity |
| OutputStatusProjection | Output status pages |
| BuildStatusProjection | Build status pages |
| DeploymentHistoryProjection | Deployment history |
| AuditProjection | Audit trail |

Rebuild via `rebuildProjectionsFromLog(eventLog, { missionId?, workspaceId? })`.

Pages should read projections — **never invent** timeline/activity rows.
