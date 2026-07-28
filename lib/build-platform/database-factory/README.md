# Database Factory (Epic 6.5)

ForgeOS Database Factory generates **blueprints/specs** for database implementation without creating live connections or deploying to Supabase.

## Inputs

- Build Context (`lib/build-platform/build-context`)
- Build DNA (`lib/build-platform/build-dna`)
- Build Registry (`lib/build-platform/build-registry`)

## Outputs

- Entity specs (tables and columns)
- Relation specs (foreign keys)
- Index specs
- RLS/auth policy specs
- Migration specs (up/down SQL steps)
- Seed specs
- Constraint specs
- Optimization recommendations

## Usage

```ts
import { createDatabaseFactory } from "@/lib/build-platform/database-factory";
import { buildBuildContextFromVenture } from "@/lib/build-platform/build-context";
import { createBuildDnaFromContext } from "@/lib/build-platform/build-dna";
import { createDatabaseFactoryInput } from "@/lib/build-platform/database-factory";

const factory = createDatabaseFactory();
const context = buildBuildContextFromVenture(venture, { persist: false });
const dna = createBuildDnaFromContext(context);
const input = createDatabaseFactoryInput(context, dna);

const blueprint = factory.generateBlueprint(input);
```

## Lab

Route: `/lab/database-factory`
