# Build DNA (Epic 6.1)

**Program 2 — Build Platform | Epic 6.1 — Build DNA**

## Objective

Create official technical DNA for each Venture. All generated software must respect Build DNA.

## Location

```
lib/build-platform/build-dna/
├── types.ts              # BuildDNA, stack, rules, validation types
├── build-dna.ts          # Core DNA entity helpers
├── dna-builder.ts        # Assemble DNA from defaults + overrides
├── dna-validator.ts      # Validate DNA completeness
├── technology-stack.ts   # Framework, Backend, Frontend, Database, etc.
├── coding-standards.ts   # Coding style, naming convention
├── architecture-rules.ts # DDD, Clean Architecture, Hexagonal, feature flags, perf budget
├── security-rules.ts     # Security rules
├── testing-rules.ts      # Testing rules
├── deployment-rules.ts   # Deployment rules
├── branding-rules.ts     # Branding rules
├── index.ts              # Minimal exports
└── README.md
```

## DNA Structure

Each venture's `BuildDna` contains:

| Section | Fields |
|---------|--------|
| **Meta** | ventureId, ventureName, version, timestamps, completenessScore, readyForGeneration |
| **Stack** | framework, backend, frontend, database, auth, payments, email, analytics, testing, cicd, deployment, monitoring |
| **Coding Standards** | codingStyle, namingConvention |
| **Architecture** | architecture, ddd, cleanArchitecture, hexagonal, featureFlags, performanceBudget |
| **Security** | rules[], oauthRequired, encryptDataAtRest, encryptDataInTransit |
| **Testing** | unitCoverageMin, integrationRequired, e2eRequired, rules[] |
| **Deployment** | environments[], rollbackStrategy, rules[] |
| **Branding** | primaryColor, fontFamily, rules[] |

## API

```typescript
import { buildDna, validateBuildDna } from "@/lib/build-platform/build-dna";

const dna = buildDna({
  ventureId: "venture-1",
  ventureName: "FleetPulse",
  overrides: {
    stack: { database: "PlanetScale" },
    architecture: { ddd: true },
  },
});

const result = validateBuildDna(dna);
// result.valid, result.completenessScore, result.issues
```

## Validation Rules

1. **Stack** — All 12 technology fields must be non-empty strings
2. **Coding** — codingStyle and namingConvention required
3. **Architecture** — Description required; DDD/Clean/Hexagonal warn if disabled
4. **Feature Flags** — Provider required when enabled
5. **Performance Budget** — maxBundleKb, maxLcpMs, maxApiLatencyMs must be > 0
6. **Security** — At least one security rule; encryption flags warn if disabled
7. **Deployment** — At least one environment; rollback strategy recommended
8. **Readiness** — `valid: true` when completeness ≥ 85% and no error-severity issues

## Relationship to Build Context

| Build Context (6.0) | Build DNA (6.1) |
|----------------------|-----------------|
| Discovery, research, PRD, brand intelligence | Technical stack and engineering rules |
| Human-readable venture intelligence | Machine-enforceable generation contract |
| `lib/build-platform/build-context/` | `lib/build-platform/build-dna/` |

Build DNA is **separate** from Build Context. Do not break Epic 6.0 when extending DNA.

## Lab Console

**Route:** `/lab/build-dna`

**Files:**
- `app/lab/build-dna/page.tsx`
- `components/lab/BuildDnaLab.tsx`
- `lib/lab/build-dna-lab.ts`

**Sections displayed:** Stack, Architecture, Frameworks, Services, Deployment, Validations

**Profiles:** ForgeOS Defaults, FleetPulse EV (complete), Incomplete DNA (validation failures)

## Constraints

- No modifications to Runtime (`lib/runtime/*`), Dashboard, Mission Control, AI Gateway, AI Orchestration
- All logic in `lib/build-platform/build-dna/`
- Direct imports, no heavy barrels
- FHIS for lab UI only

## Consumers (future)

| Consumer | Usage |
|----------|-------|
| Build Engine (6.x) | Enforce stack and rules during code generation |
| QA Engine (6.4) | Validate output against testing rules |
| Deployment Engine (6.5) | Apply deployment rules and environments |

## References

- `lib/build-platform/build-dna/README.md`
- `docs/programs/program-3-build-platform.md`
- `docs/master-plan/12_forge_dna.md` (conceptual — distinct from Build DNA module)
