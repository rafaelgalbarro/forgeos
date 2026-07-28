# Deprecation

See also root `DEPRECATION.md`.

## Rules

Do **not** delete legacy code until:

1. Zero consumers (registry + import scan)
2. Data migrated + checksum parity
3. V2-only tests green
4. Observability shows zero legacy traffic
5. Rollback drill proven

## Markers

- JSDoc / comments: `@deprecated PROGRAM 6070 — …`
- `DEPRECATION_MARKERS` in `src/core/migration/deprecation.ts`
- `evaluateDeprecationGates()` enforces gates before `canRemove`

## Status

`DEPRECATED` → `REMOVED` only after gates pass. Prefer `LEGACY_READ_ONLY` before full removal.
