# Build Registry

Each compile attempt creates an **immutable** Build record.

## Rules

- Never overwrite a failed build with success — record a new `buildId`
- Capture: codebase version, environment, commands, logs reference, result, validation, duration, resource use
- `BuildImmutabilityError` on illegal mutation

## Location

`src/core/delivery/build/registry.ts`
