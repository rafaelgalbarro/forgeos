# Epic 6.2 — Build Registry

**Program 2 — Build Platform**

## Objective

Official registry for the entire AI Software Factory — generators, providers, artifacts, workers, templates, and technology stacks.

## Location

```
lib/build-platform/build-registry/
├── types.ts
├── registry.ts
├── generator-registry.ts
├── provider-registry.ts
├── artifact-registry.ts
├── worker-registry.ts
├── template-registry.ts
├── technology-registry.ts
├── index.ts
└── README.md
```

## Registry Domains

| Domain | Module | Seed Count |
|--------|--------|------------|
| Frontend Generators | `generator-registry.ts` | 4 |
| Backend Generators | `generator-registry.ts` | 3 |
| Database Generators | `generator-registry.ts` | 3 |
| Deployment Generators | `generator-registry.ts` | 3 |
| QA Generators | `generator-registry.ts` | 3 |
| Providers | `provider-registry.ts` | 7 |
| Artifacts | `artifact-registry.ts` | 8 |
| Build Workers | `worker-registry.ts` | 7 |
| Templates | `template-registry.ts` | 6 |
| Technologies / Stacks | `technology-registry.ts` | 10 |

## Entry Contract

Every registry entry includes:

- `id` — unique identifier
- `name` — display name
- `type` — generator | provider | artifact | worker | template | technology
- `version` — semver or stack version
- `status` — draft | experimental | beta | stable | deprecated
- `description` — human-readable summary
- `capabilities` — `{ id, label, description? }[]`

## Core API

```typescript
import { createOfficialBuildRegistry } from "@/lib/build-platform/build-registry";

const registry = createOfficialBuildRegistry();

registry.find("gen-nextjs-page");
registry.filter({ type: "generator", category: "frontend", status: "stable" });
registry.list();
registry.stats();
```

## Lab Console

- Route: `/lab/build-registry`
- Component: `components/lab/BuildRegistryLab.tsx`
- Harness: `lib/lab/build-registry-lab.ts`

The lab displays all registry domains, entry tables with type/version/status, capability badges, filters, and a version index. FHIS components (Panel, Badge, Status, Card, Table) are used only in the lab UI.

## Constraints

- No modifications to `lib/runtime/*`, Dashboard, Mission Control, AI Gateway, or AI Orchestration
- Build workers reference runtime workers conceptually — no runtime imports
- Compatible with Epic 6.0 (build-context) and 6.1 (build-dna)
- Direct imports — minimal barrel in `index.ts`

## ForgeOS Defaults

Seeded with ForgeOS-native defaults: Next.js 15, React 19, FHIS, Prisma, Supabase, Vercel, Playwright, and Cursor Agent provider stubs.
