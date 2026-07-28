# FHIS Migration Report — Release 0.4.1 → 0.4.6

**Date:** 2026-07-02  
**Scope:** Presentation-only migration to ForgeOS Human Interface System (FHIS)  
**Rules observed:** No lib/portfolio changes, no business logic changes, no new routes/deps, direct FHIS imports (no barrel).

---

## Phase 1 — Dashboard / CEO Office

### Files modified
- `components/dashboard/DashboardHeader.tsx`
- `components/dashboard/PortfolioMetricCard.tsx`
- `components/dashboard/CeoBriefingCard.tsx`
- `components/dashboard/VenturePortfolioCard.tsx`
- `components/dashboard/VenturePipeline.tsx`
- `components/dashboard/ActivityFeed.tsx`
- `components/dashboard/DashboardView.tsx`
- `components/layout/Sidebar.tsx`
- `styles/fhis/components.css` (dashboard, sidebar, venture pipeline, VPC, briefing)

### Components migrated
| Screen area | FHIS components / classes |
|-------------|---------------------------|
| DashboardHeader | Badge, `fhis-dashboard-header`, `fhis-dashboard-mission`, `fhis-btn-*` |
| PortfolioMetricCard | Card, KpiBlock, `fhis-dashboard-metric-*` |
| CeoBriefingCard | Panel, AiConversation, Status, Badge, `fhis-ceo-briefing-*` |
| VenturePortfolioCard | Panel, Badge, Status, WorkerCard, KpiBlock, VenturePipeline |
| VenturePipeline | `fhis-venture-pipeline-*` (step circles/status) |
| ActivityFeed | Panel, SectionHeader, Timeline, Badge |
| DashboardView | Container, SectionHeader, EmptyState, Badge |
| Sidebar | `fhis-sidebar`, `fhis-nav-link`, Status |

### Route verified
- `/dashboard` — compiles; HTTP check in final verification

---

## Phase 2 — Portfolio / Empresas

### Files modified
- `components/projects/ProjectsList.tsx`

### Components migrated
- VentureCard, EmptyState, Button, Grid
- Language: empresa/startup (not proyecto/aplicación)

### Route verified
- `/projects`

---

## Phase 3 — New App / Discovery

### Files modified
- `components/studio/StudioHome.tsx`
- `components/studio/DiscoveryPanel.tsx`
- `components/studio/RotatingPlaceholder.tsx`
- `styles/fhis/components.css` (`fhis-studio-composer`, `fhis-discovery-chip-btn`)

### Components migrated
- StudioHome: Container, SectionHeader, Button, `fhis-studio-composer`
- DiscoveryPanel: Panel, SectionHeader, Progress, Badge, Input, chip buttons
- RotatingPlaceholder: `--fhis-color-text-muted` tokens

### Route verified
- `/` (new-app / studio home)

---

## Phase 4 — Intelligence / Venture Decision

### Files modified
- `components/studio/IntelligenceReportView.tsx`
- `components/studio/FounderAdvisorPanel.tsx`
- `components/studio/PreBuildVentureDecision.tsx`
- `components/studio/SimulatorOverridesForm.tsx`
- `components/studio/VentureSimulatorPanel.tsx`

### Components migrated
- KpiBlock, SimulatorCard, CeoCard, SectionHeader, Panel, Badge, Button, Notification, Input, Grid, Progress, EmptyState

### Route verified
- `/intelligence/[id]` — compiles without venture data dependency on FHIS

---

## Phase 5 — Venture Workspace

### Files modified
- `components/venture/VentureWorkspace.tsx`
- `components/venture/BuildPlanPanel.tsx`
- `components/venture/VentureExportMenu.tsx`

### Components migrated
- VentureWorkspace: Panel, SectionHeader, Status, Badge, `fhis-venture-topbar`, `fhis-venture-nav-item`
- BuildPlanPanel: Panel, SectionHeader, Button, Badge, Grid
- VentureExportMenu: Button, Panel

### Route verified
- `/venture/[id]`

---

## Phase 6 — Export / Print / Design System

### Files modified
- `components/venture/VenturePrintView.tsx`
- `components/venture/VentureExportMenu.tsx` (shared with Phase 5)

### Components migrated
- VenturePrintView: Button, `fhis-btn` link for toolbar
- DesignSystemShowcase: unchanged (already FHIS-native via barrel in showcase only)

### Routes verified
- `/venture/[id]/print`
- `/design-system`

---

## Phase 7 — Cleanup

### Legacy wrappers marked deprecated
- `components/ui/MetricCard.tsx` — thin wrapper → KpiBlock + Card
- `components/ui/ActionButton.tsx` — thin wrapper → `fhis-btn` classes
- `components/ui/StatusChip.tsx`, `TimelineItem.tsx`, `NotificationItem.tsx`, `ExecutiveCard.tsx`, `ActivityBadge.tsx`, `DepartmentCard.tsx` — `@deprecated` comments

### Legacy styles kept (conservative)
- `app/globals.css`: `.dash-*`, `.vpc-*`, `.vpipeline-*`, `.studio-*`, `.venture-*`, `.btn`, `.glass` — still referenced by layout shells and studio CSS grids
- Not removed in this release to avoid regressions

### Tokens / FHIS classes added
- `--fhis-*` via `styles/fhis/tokens.css` (existing)
- New layout variants in `styles/fhis/components.css`: sidebar, dashboard, venture pipeline, studio composer, discovery chips, simulator grids, venture nav

---

## Risks & pendientes

| Risk | Mitigation |
|------|------------|
| WorkerCard in VPC may be visually denser than old chips | Acceptable; FHIS consistency prioritized |
| Studio/intelligence grids still use legacy `.intelligence-grid` CSS | Phase 7 conservative — migrate grid classes in 0.4.7 |
| Link CTAs use `fhis-btn` classes (Button is `<button>` only) | Documented pattern; no `asChild` added |
| localStorage ventures untested in CI | Routes compile; manual QA with saved ventures recommended |

### Recommendations
1. Migrate remaining `glass` / `btn-*` in `AnalysisPanel.tsx` and `BuildFlow.tsx` in a follow-up patch
2. Add `fhis-intelligence-grid` to replace `.intelligence-grid` when studio CSS is consolidated
3. Consider optional `ButtonLink` FHIS primitive if link-buttons proliferate
4. Run visual regression on dashboard with 2+ ventures in localStorage

---

## Build & verification summary

| Check | Result |
|-------|--------|
| `npm run build` | **PASS** (exit 0) |
| `npm run reset:dev` | Started in background; dev failed once after cache wipe (missing prerender-manifest) — `npm run dev` restarted separately |
| HTTP `/` | 200 |
| HTTP `/dashboard` | 200 |
| HTTP `/projects` | 200 |
| HTTP `/new-app` | 308 → `/` (intentional redirect in `app/new-app/page.tsx`) |
| HTTP `/design-system` | 200 |

### Key route sizes (post-build)
| Route | Size | First Load JS |
|-------|------|---------------|
| `/` | 7.96 kB | 133 kB |
| `/dashboard` | 10.4 kB | 124 kB |
| `/projects` | 1.94 kB | 108 kB |
| `/design-system` | 6.2 kB | 109 kB |
| `/intelligence/[id]` | 3.84 kB | 136 kB |
| `/venture/[id]` | 25.1 kB | 138 kB |
| `/venture/[id]/print` | 4.51 kB | 118 kB |
