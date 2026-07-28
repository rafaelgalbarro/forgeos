# Artifact Registry V2

Knowledge / product / design / decision documents that **feed** outputs and codebases.

## Services

- `ArtifactRepository` — persistence adapter
- `ArtifactQueryService` — list/filter/latest
- `ArtifactDependencyResolver` — deps, dependents, cycle detection
- `ArtifactVersionService` — supersede + bump version (never silent overwrite)

## Not

- Not an Output (no preview payload)
- Not a Codebase (no source files tree as product delivery)
- Not a Build log

## Location

`src/core/delivery/artifact/registry.ts`
