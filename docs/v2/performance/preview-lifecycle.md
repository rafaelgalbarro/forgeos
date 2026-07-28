# Preview Lifecycle

States: PENDING → STARTING → READY → IDLE → HIBERNATED → STOPPED/EXPIRED/FAILED

## Behavior

- Hibernate idle previews after 10 minutes
- Release ports on hibernate
- Preserve build logs
- Expire after 30 minutes hibernated
- Reactivate on open with health check

## API

- `createPreviewSession()`
- `transitionPreview()`
- `hibernateIdlePreviews()`
- `reactivatePreview()`
- `getActivePreviewCount(ventureId?)`

Implementation: `src/core/performance/preview/lifecycle.ts`
