# Codebase Registry

Canonical code project. Migrated from `CodeProject` (PROGRAM 5360).

## Preserved fields

Files, templates, dependencies, scripts, env specs, source artifact IDs, checksums, validation.

## Adapter

`adaptCodeProject` in `src/core/delivery/codebase/adapters.ts`.

`shouldReuseCodebase` prevents regenerating when valid code already exists.
