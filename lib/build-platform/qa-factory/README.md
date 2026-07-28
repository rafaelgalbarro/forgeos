# QA Factory (Epic 6.6)

ForgeOS QA Factory generates **blueprints/specs** for quality assurance planning without creating final test code or running tests.

## Inputs

- Build Context (`lib/build-platform/build-context`)
- Build DNA (`lib/build-platform/build-dna`)
- Build Registry (`lib/build-platform/build-registry`)

## Outputs

- Test plan spec
- Playwright E2E spec
- Unit test spec
- Integration test spec
- Accessibility spec
- Performance spec
- Security test spec
- Regression spec

## Usage

```ts
import { createQaFactory } from "@/lib/build-platform/qa-factory";
import { createBuildContextFromVenture } from "@/lib/build-platform/build-context";
import { createBuildDnaFromContext } from "@/lib/build-platform/build-dna";
import { createQaFactoryInput } from "@/lib/build-platform/qa-factory";

const factory = createQaFactory();
const context = createBuildContextFromVenture(venture);
const dna = createBuildDnaFromContext(context);
const input = createQaFactoryInput(context, dna);

const blueprint = factory.generateBlueprint(input);
```

## Lab

Route: `/lab/qa-factory`

Action button: **Generar QA Blueprint**
