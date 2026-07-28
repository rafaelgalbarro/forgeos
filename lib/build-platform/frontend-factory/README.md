# Frontend Factory (Epic 6.3)

ForgeOS Frontend Factory generates **blueprints/specs** for frontend implementation without creating final production code.

## Inputs

- Build Context (`lib/build-platform/build-context`)
- Build DNA (`lib/build-platform/build-dna`)
- Build Registry (`lib/build-platform/build-registry`)

## Outputs

- App structure plan
- Routing plan
- Layout plan
- FHIS component mapping
- Page specs
- Navigation plan
- Form specs
- Dashboard specs
- Widget specs

## Usage

```ts
import { createFrontendFactory } from "@/lib/build-platform/frontend-factory";
import { createBuildContextFromVenture } from "@/lib/build-platform/build-context";
import { createBuildDnaFromContext } from "@/lib/build-platform/build-dna";
import { createBuildRegistryFromContext } from "@/lib/build-platform/build-registry";

const factory = createFrontendFactory();
const context = createBuildContextFromVenture(venture);
const dna = createBuildDnaFromContext(context);
const registry = createBuildRegistryFromContext(context);

const blueprint = factory.generateBlueprint({ context, dna, registry });
```
