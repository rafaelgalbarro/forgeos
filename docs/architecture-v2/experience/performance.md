# Performance — Experience Layer PROGRAM 6060

## Initial paint must NOT include

- AI Runtime
- Factory engines
- Skills pipeline
- Build Runtime
- Deployment providers

## Mechanisms

1. **Query Layer V2** — light snapshots (`getMissionOverview`, etc.)
2. **Presentation adapters** — map to view models server-side
3. **dynamic(`import()`)** — Mission Control conversation client; Studio section visuals; existing preview panels
4. **Command bridges** — dry-run by default; navigate without loading engines

## Verification

`npm run architecture:check` scans experience entry modules for forbidden heavy import paths.
