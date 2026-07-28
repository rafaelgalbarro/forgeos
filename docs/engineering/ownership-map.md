# Ownership Map — Program 4290

Classifies the ForgeOS monorepo by **engineering team owner**. Scanned against actual `lib/` and `app/` structure (July 2026).

## Team owners

| Team | Scope | Primary `lib/` paths | Primary `app/` paths |
|------|-------|----------------------|----------------------|
| **Runtime** | Task queue, workers, scheduler, state machine, observability | `lib/runtime/`, `lib/workers/` | `app/lab/runtime-scheduler/`, `app/lab/task-queue/`, `app/lab/state-machine/`, `app/lab/workers/`, `app/lab/execution-engine/`, `app/lab/runtime-observability/` |
| **AI Runtime** | Model router, providers, memory, prompt compiler, telemetry | `lib/ai-runtime/`, `lib/ai-control/`, `lib/ai-gateway/`, `lib/ai-orchestration/`, `lib/ai/` | `app/lab/ai-runtime/`, `app/ai/` |
| **Executive** | Mesh, board, FOS kernel, CEO office, autonomous org | `lib/executive-mesh/`, `lib/board/`, `lib/fos/`, `lib/ceo/`, `lib/ceo-office/`, `lib/ceo-workspace/`, `lib/autonomous-organization/`, `lib/intelligence-layer/` | `app/lab/executive-mesh/`, `app/lab/ai-collaboration/`, `app/lab/autonomous-organization/`, `app/ceo/`, `app/os/ceo/` |
| **Skills** | Registry, governance, store, capability layer | `lib/skills/`, `lib/skills-governance/`, `lib/skills-store/`, `lib/capabilities/` | `app/lab/skills/`, `app/lab/skills-governance/`, `app/lab/skill-store/`, `app/lab/*-skills/`, `app/lab/capabilities/`, `app/store/` |
| **Factories** | Build DNA, context, registry, factories, pipeline, real execution | `lib/build-platform/`, `lib/build-engine/`, `lib/build-pipeline/`, `lib/build-plan/`, `lib/real-build-flow/`, `lib/real-execution/`, `lib/venture-factory/` | `app/lab/build-dna/`, `app/lab/build-context/`, `app/lab/build-registry/`, `app/lab/*-factory/`, `app/lab/real-build-flow/`, `app/lab/real-execution/`, `app/os/build/`, `app/build/`, `app/deployments/`, `app/venture-factory/` |
| **Command Center** | Founder command surface, panels, summary loader | `lib/command-center/` | `app/command-center/`, `app/lab/command-center/` |
| **UX & Navigation** | Sidebar, nav config, first experience, shell | `lib/navigation/`, `lib/home/`, `lib/design-system/`, `lib/os/` | `app/page.tsx`, `app/labs/`, `components/home/`, `components/layout/`, `components/os/` |
| **Platform** | Master program, delivery, persistence, auth, health | `lib/programs/`, `lib/platform/`, `lib/delivery/`, `lib/persistence/`, `lib/auth/`, `lib/health/` | `app/os/`, `app/settings/`, `app/register/`, `app/login/` |
| **Venture Core** | Discovery, portfolio, knowledge, simulator, export | `lib/discovery/`, `lib/portfolio/`, `lib/knowledge/`, `lib/knowledge-hub/`, `lib/venture-simulator/`, `lib/export/`, `lib/brain/`, `lib/venture-workspace/` | `app/os/portfolio/`, `app/os/knowledge/`, `app/venture/`, `app/ideas/` |
| **Commercial** | Billing, pricing, subscriptions, Stripe stub | `lib/commercial/` | `app/billing/`, `app/pricing/`, `app/subscriptions/` |
| **Production** | Health, alerts, monitoring, release manager | `lib/production-readiness/` | `app/production/`, `app/health/`, `app/incidents/`, `app/monitoring/`, `app/lab/production-readiness/` |
| **Network** | Intelligence network, benchmarks, consent | `lib/intelligence-network/`, `lib/network/` | `app/network/`, `app/network-insights/`, `app/benchmarks/`, `app/lab/network/` |
| **Customer Success** | Feedback, health, roadmap aggregation | `lib/customer-success/`, `lib/design-partners/` | `app/customer-success/`, `app/feedback-center/`, `app/design-partners/` |
| **Ecosystem** | Marketplace, plugins, SDK, capital | `lib/marketplace/`, `lib/plugins/`, `lib/sdk/`, `lib/ecosystem/`, `lib/forge-capital/`, `lib/venture-intelligence/` | `app/marketplace/`, `app/plugins/`, `app/sdk/`, `app/capital/`, `app/lab/ecosystem/`, `app/lab/forge-capital/` |
| **Validation / Labs** | Harnesses, fixtures, E2E | `lib/founder-zero/`, `lib/venture-e2e/`, `lib/lab/`, `lib/fixtures/`, `lib/rc1-integration/` | `app/lab/`, `app/founder-zero/`, `app/ventures/` |
| **Docs & Governance** | Contracts, audits, engineering policy | `docs/` | `app/docs/`, `app/engineering/` |
| **Integrations** | Real connections, Supabase, providers | `lib/connections/` | `app/lab/real-connections/` |

## Master Program 2030 alignment

Per `lib/programs/mapping.ts`:

| Master Program | Engineering teams involved |
|----------------|---------------------------|
| venture-core | Venture Core, UX (design-system) |
| venture-execution | Factories, Runtime |
| venture-intelligence | Executive, AI Runtime, Skills |
| venture-platform | Platform, Commercial, Production |
| venture-ecosystem | Ecosystem, Network |

## Cross-cutting (Architecture Owner only)

- `app/layout.tsx`, `app/page.tsx`
- `next.config.ts`, `package.json`, `tsconfig.json`
- `lib/navigation/sidebar-items.ts` (when changing primary nav)
- `components/layout/`, `components/os/ForgeOSShell.tsx`

## Orphan rule

New `lib/` directories **must** map to a team owner and a Master Program entry before merge. See [../master-program/governance.md](../master-program/governance.md).
