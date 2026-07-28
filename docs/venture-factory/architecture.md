# Venture Factory — Architecture

## Overview

```
Idea Input
    ↓
VentureFactoryEngine (client simulation)
    ↓
factory-pipeline.ts (18 stages)
    ↓
Module generators (mock/simulated)
    ↓
VentureFactoryOutput (unified result)
    ↓
VentureFactoryView (FHIS UI)
```

## Layers

### `lib/venture-factory/`

- **venture-factory.ts** — `VentureFactoryEngine`, command validation, sync `previewVenture()`
- **factory-pipeline.ts** — stage definitions, orchestration messages, `buildVentureOutput()`
- **idea-context.ts** — vertical detection (premium eyewear, SaaS, ecommerce)
- **types.ts** — shared types

### Adapters

- **discovery** — `previewDiscovery()` used in Research stage when idea ≥12 chars
- No runtime/build-platform execution — deployment is preview-only

### UI

- **VentureFactoryView** — main product UI at `/venture-factory`
- **VentureFactoryLabView** — engineering lab at `/lab/venture-factory`

### Lab harness

- **lib/lab/venture-factory-lab.ts** — KPIs, sample ideas, demo preview

## Design principles

1. Self-contained mock outputs when no AI keys
2. Staged client-side animation (live-ai pattern)
3. Spanish UI
4. No breaking changes to RC6 modules
