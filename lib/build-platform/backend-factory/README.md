# Backend Factory (Epic 6.4)

ForgeOS Backend Factory generates **blueprints/specs** for backend implementation without creating final production code or deployment artifacts.

## Inputs

- Build Context (`lib/build-platform/build-context`)
- Build DNA (`lib/build-platform/build-dna`)
- Build Registry (`lib/build-platform/build-registry`)

## Outputs

- API route/endpoint plan
- Service layer specs
- Repository/data access specs
- Domain event specs
- Background worker specs
- Security rules (from DNA + context)
- RBAC/permission specs
- Background job/queue specs

## Usage

```ts
import { createBackendFactory } from "@/lib/build-platform/backend-factory";
import { buildBuildContextFromVenture } from "@/lib/build-platform/build-context";
import { createBuildDnaFromContext } from "@/lib/build-platform/build-dna";
import { createBackendFactoryInput } from "@/lib/build-platform/backend-factory";

const factory = createBackendFactory();
const context = buildBuildContextFromVenture(venture);
const dna = createBuildDnaFromContext(context);
const input = createBackendFactoryInput(context, dna);

const blueprint = factory.generateBlueprint(input);
```

## Lab

Route: `/lab/backend-factory`
