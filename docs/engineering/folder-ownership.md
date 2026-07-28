# Folder Ownership — Program 4290

Per-folder ownership derived from actual repo structure. **Can modify** = assigned team or Architecture Owner. **Cannot modify** = other teams without escalation.

## Application (`app/`)

| Folder | Owner | Description | Responsibility | Dependencies | Can modify | Cannot modify |
|--------|-------|-------------|----------------|--------------|------------|---------------|
| `app/` (root) | UX | Next.js App Router entry | Route tree, metadata | `components/`, `lib/` | UX, Architecture Owner | All other teams on `layout.tsx`, `page.tsx` |
| `app/command-center/` | Command Center | Founder command surface | Dashboard route | `lib/command-center/` | Command Center team | Runtime, Mesh direct edits |
| `app/lab/` | Validation | Engineering harnesses | Lab pages per RC/program | `lib/lab/`, domain `lib/` | Validation + domain owner | Production routes |
| `app/labs/` | UX | Labs hub index | Central lab links | `lib/navigation/labs-registry.ts` | UX | Skills, Runtime |
| `app/os/` | Platform | ForgeOS OS shell routes | Portfolio, build, settings | `lib/os/`, `components/os/` | Platform, UX | Executive engines |
| `app/production/` | Production | Health center route | Production UI | `lib/production-readiness/` | Production team | Build pipeline |
| `app/engineering/` | Architecture | Governance metadata dashboard | Static status display | `docs/engineering/status.json` | Architecture Owner | Product features |
| `app/ventures/` | Validation | Venture E2E workspace | Generic venture pipeline | `lib/venture-e2e/` | Validation | Venture Factory core |

## Components (`components/`)

| Folder | Owner | Description | Responsibility | Dependencies | Can modify | Cannot modify |
|--------|-------|-------------|----------------|--------------|------------|---------------|
| `components/layout/` | UX | App shell, sidebar | Global layout chrome | `lib/navigation/` | UX only | All teams |
| `components/home/` | UX | First experience UI | Hero, cards, insight panels | `lib/home/` | UX (4255) | Command Center team |
| `components/os/` | UX / Platform | ForgeOS shell | `ForgeOSShell`, `OsSidebar` | `lib/os/`, `lib/navigation/` | UX, Platform | Runtime |
| `components/command-center/` | Command Center | CC dashboards | Panel layout | `lib/command-center/` | Command Center | Mesh internals |
| `components/production-readiness/` | Production | Health panels | Monitoring UI | `lib/production-readiness/` | Production | AI Runtime |
| `components/venture-factory/` | Factories | Factory views | Venture creation UI | `lib/venture-factory/` | Factories | Skills |

## Core engines (`lib/`)

| Folder | Owner | Description | Responsibility | Dependencies | Can modify | Cannot modify |
|--------|-------|-------------|----------------|--------------|------------|---------------|
| `lib/runtime/` | Runtime | Execution substrate | Queue, workers, scheduler, observability | `lib/ai-orchestration/` (adapter) | Runtime | UX, Commercial |
| `lib/ai-runtime/` | AI | Model execution | Router, providers, memory, telemetry | `lib/ai-control/` | AI Runtime | Skills registry |
| `lib/executive-mesh/` | Executive | Multi-agent coordination | Decision pipeline, departments | `lib/ai-runtime/`, `lib/board/` | Executive | UX nav |
| `lib/skills/` | Skills | Skill modules | Provider router, executors | `lib/capabilities/`, `lib/skills-governance/` | Skills | Runtime core |
| `lib/skills-governance/` | Skills | Safety & approval | Execution guard, risk | `lib/skills/` | Skills | Commercial |
| `lib/capabilities/` | Skills | Capability layer | Policies, planner, store | `lib/skills/` | Skills | Mesh |
| `lib/command-center/` | Command Center | CC orchestration | Panels, summary loader | Mesh, AI, Runtime (read) | Command Center | Engine internals |
| `lib/navigation/` | UX | Nav registry | Sidebar, commands, labs | None (Tier 1 protected) | UX | All other teams |
| `lib/home/` | UX | First experience data | Snapshot, routes, summary types | `lib/ceo/` (light) | UX | Full CC loader |

## Factories (`lib/build-*`, venture)

| Folder | Owner | Description | Responsibility | Dependencies | Can modify | Cannot modify |
|--------|-------|-------------|----------------|--------------|------------|---------------|
| `lib/build-platform/` | Factories | Build factories | DNA, context, registry, factories | `lib/build-engine/` | Factories | Runtime |
| `lib/build-engine/` | Factories | Build orchestration | Planner, generator, deployment | `lib/build-plan/` | Factories | Mesh |
| `lib/build-pipeline/` | Factories | Unified pipeline | Build reports, stages | `lib/real-build-flow/` | Factories | package.json |
| `lib/real-build-flow/` | Factories | RC5.2 flow | GitHub/Vercel steps | `lib/real-execution/` | Factories | Connections security |
| `lib/real-execution/` | Factories | Provider execution | GitHub real executor | `lib/connections/` | Factories + Connections | Skills |
| `lib/venture-factory/` | Factories | Venture creation | Generators, pricing, launch | `lib/build-platform/` | Factories | Executive |

## Platform & programs

| Folder | Owner | Description | Responsibility | Dependencies | Can modify | Cannot modify |
|--------|-------|-------------|----------------|--------------|------------|---------------|
| `lib/programs/` | Platform | Master Program 2030 | Constants, mapping, modules | `lib/platform/` | Platform, Architecture | Feature teams |
| `lib/platform/` | Platform | Pillar adapters | Strategy, build, launch, growth | Program mapping | Platform | Engine teams |
| `lib/delivery/` | Platform | Epic registry | Roadmap status | `lib/programs/` | Platform | — |
| `lib/persistence/` | Platform | Storage adapters | Local/sync/repos | — | Platform | Domain logic |
| `lib/auth/` | Platform | Auth types/flow | Session scaffolding | — | Platform | Commercial billing |

## Operations & growth

| Folder | Owner | Description | Responsibility | Dependencies | Can modify | Cannot modify |
|--------|-------|-------------|----------------|--------------|------------|---------------|
| `lib/commercial/` | Commercial | Billing & pricing | Stripe stub, plans | — | Commercial | Production alerts |
| `lib/production-readiness/` | Production | 24/7 readiness | Health, alerts, tracing | `lib/ai-control/` (read) | Production | Build engine |
| `lib/customer-success/` | Customer Success | CS platform | Feedback aggregation | `lib/design-partners/` | CS | Network writes |
| `lib/intelligence-network/` | Network | Collective intelligence | Consent, benchmarks | `lib/design-partners/` (read) | Network | CS writes |
| `lib/connections/` | Integrations | Real connections | Supabase, security | — | Connections | Skills executors |

## Validation

| Folder | Owner | Description | Responsibility | Dependencies | Can modify | Cannot modify |
|--------|-------|-------------|----------------|--------------|------------|---------------|
| `lib/founder-zero/` | Validation | Program 4000 | Pipeline stages, checklist | — | Validation | Venture Factory |
| `lib/venture-e2e/` | Validation | Program 10000 | E2E types, fixtures | `lib/fixtures/` | Validation | Production |
| `lib/lab/` | Validation | Lab harness helpers | Per-domain lab loaders | Domain `lib/` | Validation + domain | — |

## Documentation

| Folder | Owner | Description | Responsibility | Dependencies | Can modify | Cannot modify |
|--------|-------|-------------|----------------|--------------|------------|---------------|
| `docs/engineering/` | Architecture | Governance contracts | Ownership, policies | — | All agents (docs) | — |
| `docs/master-program/` | Platform | Program methodology | Mapping, principles | `lib/programs/` | Platform | — |
| `docs/*` (other) | Domain owner | Domain docs | Per RC/program | Matching `lib/` | Domain team | Protected core code |
