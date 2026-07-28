# Composition Root Performance

## Core Services (Eager)

Loaded on first `getCompositionRoot()` call:

- commandBus, queryBus, eventBus
- missionRepository, ventureRepository
- featureFlags, clock (via ports)

## Lazy Services (On Demand)

Loaded via `loadLazyService()` server-side only:

- factories, aiRuntime, previewRuntime
- deploymentAdapters, provenanceGraph
- exportEngine, codeGen, heavyGraph

## Measurement

`measureCompositionRootInit()` returns cold/warm init times.

Access registry via `getCompositionRoot().lazyServices`.
