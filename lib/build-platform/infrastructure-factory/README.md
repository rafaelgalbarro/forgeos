# Infrastructure Factory (Epic 6.7)

ForgeOS Infrastructure Factory generates **blueprints/specs** for deployment and cloud infrastructure without creating real credentials or performing deployments.

## Inputs

- Build Context (`lib/build-platform/build-context`)
- Build DNA (`lib/build-platform/build-dna`)
- Build Registry (`lib/build-platform/build-registry`)

## Outputs

Adapter config specs for:

- Docker (compose, services, volumes)
- GitHub Actions (CI/CD workflows)
- Vercel (project, env keys, domains)
- Cloudflare (workers, DNS, WAF)
- Supabase (tables, auth, storage — config only)
- Railway (services, volumes)
- AWS (ECS, RDS, S3, CloudFront)
- Azure (App Service, PostgreSQL, Key Vault)
- GCP (Cloud Run, Cloud SQL, GCS)

## Usage

```ts
import { createInfrastructureFactory } from "@/lib/build-platform/infrastructure-factory";
import { createBuildContextFromVenture } from "@/lib/build-platform/build-context";
import { createBuildDnaFromContext } from "@/lib/build-platform/build-dna";
import { createInfraFactoryInput } from "@/lib/build-platform/infrastructure-factory";

const factory = createInfrastructureFactory();
const context = createBuildContextFromVenture(venture);
const dna = createBuildDnaFromContext(context);
const input = createInfraFactoryInput(context, dna);

const blueprint = factory.generateBlueprint(input);
```

## Constraints

- Adapter configs only — no real API keys or credentials
- No deployment execution
- Does not modify Runtime, Dashboard, Mission Control, AI Gateway, or AI Orchestration
