# Event Catalog

Catalogs are **separated**. There is **no** ambiguous catch-all type for everything.

| Kind | Module | Drives transitions? |
|------|--------|---------------------|
| domain | `catalog/domain-events.ts` | Yes |
| application | `catalog/application-events.ts` | Yes (orchestration) |
| integration | `catalog/integration-events.ts` | No (ingestion wrappers) |
| telemetry | `catalog/telemetry-events.ts` | **Never** |
| ui_notification | `catalog/ui-notifications.ts` | No |

Use `resolveCatalogKind(eventType)` and `mayDriveStateTransition(kind)`.

Domain catalog includes both PROGRAM 6010 PascalCase names (`MissionStatusChanged`) and operational SCREAMING_SNAKE names (`MISSION_STATE_CHANGED`) for compatibility during transition.
