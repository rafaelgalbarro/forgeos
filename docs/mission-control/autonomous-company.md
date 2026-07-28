# PROGRAM 5600 — Autonomous Company

Post-deploy company management workspaces integrated into Mission Control OPERATE/EVOLVE phases.

## Overview

After deployment, ForgeOS continues helping manage the company. Nine lightweight workspace panels surface data from existing modules via public adapters — no new engines.

## Workspaces

| Workspace | Adapter source | Data |
|-----------|----------------|------|
| Marketing | `lib/agents-marketplace/` | Campaigns, channels, marketing agents |
| SEO | `lib/agents-marketplace/` | Score, keywords, top queries |
| Roadmap | `lib/customer-success/` + localStorage | Design partner votes, demo items |
| Customer Feedback | `lib/customer-success/` → design-partners | Feedback inbox |
| NPS | `lib/customer-success/` → nps-engine | Net Promoter Score |
| KPIs | `lib/customer-success/` | Success score, retention, activation |
| Product Metrics | `lib/customer-success/` | Event counts, top paths |
| Backlog | localStorage per mission | Demo seed items |
| Incidents | `lib/production-readiness/` | Incident tracker |

## Visibility

Workspaces appear when:

- Mission phase is **OPERATE** or **EVOLVE**, or
- Phase is **DEPLOY** and deployment snapshot is **completed**

UI placement:

- **Right column**: domain badges in `MissionProgressPanel`
- **Bottom section**: tabbed `CompanyWorkspacesPanel` ("Gestión Empresa") — no navigation away from `/mission-control`

## Module layout

```
lib/mission-control/autonomous-company/
├── types.ts
├── company-workspaces.ts
├── operate-phase.ts
├── evolve-phase.ts
├── workspace-snapshots.ts
├── mission-local-storage.ts
├── company-events.ts
├── adapters/
│   ├── customer-success-adapter.ts
│   ├── marketplace-adapter.ts
│   ├── production-adapter.ts
│   └── self-evolution-adapter.ts
└── index.ts
```

## Phase hooks

- `advancePhase()` in `mission-flow.ts` calls `activateOperatePhase()` and `activateEvolvePhase()`
- Events emitted via `live-mission/event-emitter`: `company_feedback`, `company_incident`, `company_kpi`

## SSR strategy

- `buildMissionControlSnapshot()` includes `companyWorkspaces` seed (no heavy imports)
- Full snapshot loaded client-side via `buildCompanyWorkspacesSnapshot()` when post-deploy phase is active
- Workspace panels use `dynamic()` for lazy loading

## Components

```
components/mission-control/company/
├── CompanyWorkspacesPanel.tsx
├── MarketingWorkspace.tsx
├── SEOWorkspace.tsx
├── RoadmapWorkspace.tsx
├── CustomerFeedbackPanel.tsx
├── NPSPanel.tsx
├── KPIsPanel.tsx
├── ProductMetricsPanel.tsx
├── BacklogPanel.tsx
└── IncidentsPanel.tsx
```
