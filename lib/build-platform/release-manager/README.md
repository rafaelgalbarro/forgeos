# Release Manager (Epic 6.8)

Official Release Manager for the ForgeOS AI Software Factory. Converts outputs from Build Context, Build DNA, Build Registry, and all factory modules into a **release package** ready for review.

## Constraints

- Specs, artifacts, and validations only — **no deploy**, **no real credentials**, **no real builds**
- All logic lives in `lib/build-platform/release-manager/`
- Direct imports from upstream build-platform modules only

## API

```ts
import { createReleaseManager } from "@/lib/build-platform/release-manager";

const manager = createReleaseManager();
const pkg = manager.buildReleasePackage({ venture });
```

## Release Package

Includes: `releaseId`, `ventureId`, `version`, `status`, `createdAt`, `artifacts`, `qualityGates`, `approvals`, `rollbackPlan`, `releaseNotes`, `deploymentChecklist`, `timeline`.

## Lab

Route: `/lab/release-manager`
