# Build Registry (Epic 6.2)

Official registry for the ForgeOS AI Software Factory — generators, providers, artifacts, workers, templates, and technology stacks.

## Location

`lib/build-platform/build-registry/`

## Modules

| File | Purpose |
|------|---------|
| `types.ts` | Entry types, status, versions, query contracts |
| `registry.ts` | Core engine — register, find, filter, list, stats |
| `generator-registry.ts` | Frontend, Backend, Database, Deployment, QA generators |
| `provider-registry.ts` | AI and deployment providers |
| `artifact-registry.ts` | Generated artifact types |
| `worker-registry.ts` | Build workers (conceptual mirror of runtime workers) |
| `template-registry.ts` | Project templates |
| `technology-registry.ts` | Stacks and technologies |
| `index.ts` | Minimal public exports |

## Usage

```typescript
import { createOfficialBuildRegistry } from "@/lib/build-platform/build-registry";

const registry = createOfficialBuildRegistry();
const frontend = registry.filter({ type: "generator", category: "frontend" });
const stable = registry.filter({ status: "stable" });
```

Sub-registries can also be created independently:

```typescript
import { createGeneratorRegistry } from "@/lib/build-platform/build-registry/generator-registry";
```

## Lab

Interactive console at `/lab/build-registry`.

## Constraints

- Does not modify `lib/runtime/*`
- FHIS components used only in lab UI
- Direct imports — no heavy barrel re-exports beyond `index.ts`
