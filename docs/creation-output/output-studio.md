# Output Studio

Route: `/studio/[missionId]`

## UI Sections

1. **Output Selector** — 6 output type cards
2. **Version Selector** — Version history + compare
3. **Preview** — Lazy-loaded per type
4. **Structure** — Files, routes, artifacts
5. **Validation** — Score and checks
6. **Actions** — Approve, change request, export

## Performance

- Server loads light metadata via `loadStudioSnapshotServer`
- Previews use `dynamic()` imports
- Website preview: iframe `sandbox="allow-same-origin"`
- No full factories in initial bundle

## Error States

Uses `LoadingState`, `ErrorState`, `EmptyState`, `UnavailableState`.

## Change Requests

"Solicitar cambios" creates `ChangeRequest`, new version if approved version, never modifies approved directly.
