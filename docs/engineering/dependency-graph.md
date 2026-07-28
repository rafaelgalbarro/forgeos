# Dependency Graph — Program 4290

ForgeOS system dependency chains. Downstream consumers must not be edited upstream without coordination.

## Mermaid — Core platform chain

```mermaid
flowchart TB
  subgraph UX["UX & Entry"]
    HOME["/ — First Experience<br/>Program 4255"]
    NAV["lib/navigation"]
    HOME --> NAV
  end

  subgraph CC["Command Center — Program 4500"]
    CC_APP["app/command-center"]
    CC_LIB["lib/command-center"]
    CC_APP --> CC_LIB
  end

  subgraph RT["Runtime — RC1/RC2"]
    RT_LIB["lib/runtime"]
    RT_Q["task-queue"]
    RT_W["workers"]
    RT_SM["state-machine"]
    RT_LIB --> RT_Q
    RT_LIB --> RT_W
    RT_LIB --> RT_SM
  end

  subgraph MESH["Executive Mesh — RC4"]
    EM["lib/executive-mesh"]
    BOARD["lib/board"]
    FOS["lib/fos"]
    CEO["lib/ceo"]
    EM --> BOARD
    EM --> FOS
    EM --> CEO
  end

  subgraph AI["AI Runtime — RC6"]
    AIR["lib/ai-runtime"]
    AIC["lib/ai-control"]
    AIR --> AIC
  end

  subgraph SK["Skills — RC4.x"]
    SKILLS["lib/skills"]
    GOV["lib/skills-governance"]
    CAP["lib/capabilities"]
    SKILLS --> GOV
    SKILLS --> CAP
  end

  NAV --> CC_APP
  CC_LIB --> EM
  CC_LIB --> AIR
  CC_LIB --> RT_LIB
  EM --> AIR
  EM --> SKILLS
  RT_LIB --> SKILLS
  AIR --> SKILLS
```

## Mermaid — Build & deploy chain

```mermaid
flowchart LR
  VF["Venture Factory<br/>lib/venture-factory<br/>RC7"]
  DNA["Build DNA<br/>lib/build-platform/build-dna"]
  CTX["Build Context<br/>lib/build-platform/build-context"]
  REG["Build Registry<br/>lib/build-platform/build-registry"]
  FF["Frontend Factory"]
  BF["Backend Factory"]
  DF["Database Factory"]
  IF["Infrastructure Factory"]
  QF["QA Factory"]
  BE["Build Engine<br/>lib/build-engine"]
  BP["Build Pipeline<br/>lib/build-pipeline"]
  RBF["Real Build Flow<br/>lib/real-build-flow"]
  REX["Real Execution<br/>lib/real-execution"]
  CONN["Connections<br/>lib/connections"]
  DEP["Deployments<br/>app/deployments"]

  VF --> DNA
  DNA --> CTX
  CTX --> REG
  REG --> FF
  REG --> BF
  REG --> DF
  REG --> IF
  FF --> QF
  BF --> QF
  BE --> BP
  BP --> RBF
  RBF --> REX
  REX --> CONN
  BP --> DEP
```

## Mermaid — Founder validation chain

```mermaid
flowchart TB
  FZ["Founder Zero<br/>lib/founder-zero<br/>Program 4000"]
  E2E["Venture E2E<br/>lib/venture-e2e<br/>Program 10000"]
  FIX["Fixtures<br/>lib/fixtures"]
  VW["Venture Workspace<br/>lib/venture-workspace"]
  CC["Command Center<br/>Program 4500"]

  FZ --> E2E
  FIX --> E2E
  E2E --> VW
  FZ --> CC
```

## Mermaid — Commercial & production

```mermaid
flowchart TB
  COMM["Commercial<br/>lib/commercial<br/>Program 6000"]
  PROD["Production Readiness<br/>lib/production-readiness<br/>Program 6500"]
  NET["Intelligence Network<br/>lib/intelligence-network<br/>Program 9000"]
  CS["Customer Success<br/>lib/customer-success<br/>Program 8000"]
  DP["Design Partners<br/>lib/design-partners"]

  COMM --> PROD
  CS --> DP
  NET --> DP
  PROD --> COMM
```

## ASCII — Simplified execution order

```
First Experience (4255)
    └── Navigation (4100)
            └── Command Center (4500)
                    ├── Executive Mesh (RC4)
                    │       ├── Board / FOS / CEO
                    │       └── AI Runtime (RC6)
                    │               └── Skills (RC4.x)
                    └── Runtime (RC1)
                            └── Workers / Task Queue

Venture Factory (RC7)
    └── Build DNA → Build Context → Build Registry
            └── Factories (FE/BE/DB/Infra/QA)
                    └── Build Engine → Build Pipeline
                            └── Real Build Flow → Real Execution
                                    └── Connections (RC5) → Deployments

Founder Zero (4000) → Venture E2E (10000) → Venture Workspace

Commercial (6000) ──┬── Production (6500)
Customer Success (8000) ──┬── Design Partners
Intelligence Network (9000) ──┘
```

## Dependency rules for agents

1. **Do not** modify downstream UI before upstream types stabilize
2. **Do not** add circular imports across Mesh ↔ AI Runtime ↔ Skills
3. **Prefer** read-only adapters (`lib/executive-mesh/adapters/`) over direct cross-engine calls
4. **Build chain** changes require Factories team + single integration build
5. **Navigation** changes require UX team after Command Center contract is honored

## Source references

- `lib/executive-mesh/adapters/ai-runtime-adapter.ts`
- `lib/real-build-flow/real-execution-bridge.ts`
- `lib/runtime/execution-engine/ai-orchestration-adapter.ts`
- `lib/command-center/summary-loader.ts` (compact snapshot — 4250)
