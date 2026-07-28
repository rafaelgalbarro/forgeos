# Build Context (Epic 6.0)

Official single source of truth for ForgeOS AI Software Factory generators.

## Flow

```
Venture / modules (read-only adapters)
        ↓
context-builder
        ↓
BuildContext (20 sections)
        ↓
context-validator
        ↓
Generators (future epics)
```

## Sections

Discovery, Research, Competitors, Business Model, Brand, Users, Personas, Architecture, UX, Product PRD, Knowledge, Memory, Decision Graph, Workers, Build Plan, Deployment Target, Analytics, Security, Infrastructure, QA.

Each section: `data`, `origin`, `status`, `validation`.

## Usage

```typescript
import { buildBuildContextFromVenture } from "@/lib/build-platform/build-context";

const context = buildBuildContextFromVenture(venture);
console.log(context.meta.completenessScore, context.meta.readyForBuild);
```

## Isolation

- Does not modify Runtime, Dashboard, Mission Control, AI Gateway, or AI Orchestration.
- Adapters read existing venture fields only.

## Lab

`/lab/build-context` — inspect full context for mock venture.
