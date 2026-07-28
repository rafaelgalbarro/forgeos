# Build DNA (Epic 6.1)

Official technical DNA for each Venture. All generated software must respect Build DNA.

## Location

`lib/build-platform/build-dna/`

## Purpose

Build DNA defines the **non-negotiable technical contract** for a venture: stack, architecture patterns, coding standards, security, testing, deployment, and branding rules. It is separate from [Build Context](../build-context/) (Epic 6.0), which holds discovery and product intelligence.

## Core API

```typescript
import { buildDna, validateBuildDna } from "@/lib/build-platform/build-dna";

const dna = buildDna({
  ventureId: "venture-1",
  ventureName: "FleetPulse",
  overrides: { stack: { database: "PlanetScale" } },
});

const validation = validateBuildDna(dna);
```

## DNA Sections

| Section | Module | Contents |
|---------|--------|----------|
| Stack | `technology-stack.ts` | Framework, Backend, Frontend, Database, Auth, Payments, Email, Analytics, Testing, CI/CD, Deployment, Monitoring |
| Coding | `coding-standards.ts` | Coding style, naming convention |
| Architecture | `architecture-rules.ts` | DDD, Clean Architecture, Hexagonal, feature flags, performance budget |
| Security | `security-rules.ts` | Security rules and encryption flags |
| Testing | `testing-rules.ts` | Coverage targets and test policies |
| Deployment | `deployment-rules.ts` | Environments, rollback, deploy rules |
| Branding | `branding-rules.ts` | Colors, typography, brand rules |

## Validation

`validateBuildDna()` checks:

- All 12 stack fields are non-empty
- Coding style and naming convention present
- Architecture description and performance budget set
- Security rules defined
- Deployment environments configured
- Returns `valid: true` when completeness ≥ 85% and no errors

## Lab

Interactive console: `/lab/build-dna`

## Constraints

- Do not modify Runtime, Dashboard, Mission Control, AI Gateway, or AI Orchestration
- Direct imports preferred over heavy barrel re-exports
- FHIS components for lab UI only
