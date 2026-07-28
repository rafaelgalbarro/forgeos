# Experience Map — PROGRAM 6000

**Date:** 2026-07-24  
**Evidence:** `app/**/page.tsx` (164 routes), `next.config.ts` redirects, `lib/navigation/sidebar-items.ts` (`active` | `legacy` | `lab`), page-level `redirect()`.

### Classification legend

| Class | Meaning |
|-------|---------|
| **Core** | Primary product spine / sidebar `active` primary experiences |
| **Supporting** | Useful product/OS surfaces, not the main spine |
| **Admin** | Admin/enterprise consoles |
| **Lab** | Engineering harnesses (`/lab/*`, status `lab`) |
| **Legacy** | Marked legacy in sidebar/banners |
| **Duplicate** | Parallel UI for same capability |
| **Candidate for redirect** | Already redirects or should consolidate |

---

## Focused routes

| Route | Class | Evidence |
|-------|-------|----------|
| `/` | **Core** | First experience home; sidebar `home` active |
| `/mission-control` | **Core** | Primary experience; Mission Control client |
| `/mission-control/[missionId]` | **Core** | Detail |
| `/missions/[missionId]` | **Candidate for redirect** | Hard redirect → `/mission-control/[missionId]` |
| `/ventures/[slug]` | **Core** | E2E venture pipeline; index → `aurea-facilities` |
| `/venture/[id]` (+ knowledge/timeline/print) | **Legacy / Duplicate** | Different libs/workspace vs `/ventures/[slug]`; `useLegacy` branch |
| `/studio/[missionId]` | **Core** | Creation Output Studio (5350) |
| `/studio/[missionId]/code` | **Core** | Code studio (5360) |
| `/studio/[missionId]/preview` | **Core** | Preview studio (5370) |
| `/command-center` | **Legacy** | Sidebar `legacy`; CommandCenterDashboard |
| `/lab/command-center` | **Lab** | LabView twin |
| `/founder` | **Legacy** | LegacyConsolidationBanner → Command Center |
| `/founder-journey` | **Supporting** | Journey view |
| `/founder-zero` | **Supporting** | Product frame + lab link |
| `/lab/founder-zero` | **Lab** | Harness |
| `/website-factory` | **Core** | Sidebar active |
| `/mobile-factory` | **Core** | Sidebar active |
| `/application-factory` | **Core** | Sidebar active |
| `/venture-factory` | **Supporting** | Product view |
| `/lab/website-factory` | **Lab / Duplicate** | Same dashboard as product |
| `/lab/venture-factory` | **Lab** | LabView |
| `/deployments` | **Core / Supporting** | Build pipeline + preview history; sidebar Build child |
| `/lab/*` (52 pages) | **Lab** | Engineering validation |
| `/admin` | **Admin** | Enterprise admin demo |
| `/dashboard`, `/creator` | **Legacy** | Banners + LEGACY_SIDEBAR_ITEMS |
| `/os/creator` | **Supporting / Duplicate** | Same CreatorFlowView without legacy banner |
| `/landing` | **Supporting** | Marketing (separate from `/`) |
| `/new-app` | **Candidate for redirect** | Permanent → `/` |
| `/new-app/generating/[id]` | **Candidate for redirect** | → `/build/[id]` |
| `/build` | **Candidate for redirect** | Config → `/os/build` |
| `/build/[id]` | **Supporting** | Still serves BuildFlow |
| `/resultado/[id]` | **Candidate for redirect** | → `/venture/[id]` |

---

## Config redirects (`next.config.ts`)

- `/new-app` → `/` (permanent)
- `/ventures` → `/ventures/aurea-facilities` (temporary)
- `/build` → `/os/build` (temporary)

---

## Product ↔ Lab pairs (duplicates)

| Product | Lab twin |
|---------|----------|
| `/website-factory` | `/lab/website-factory` |
| `/venture-factory` | `/lab/venture-factory` |
| `/founder-zero` | `/lab/founder-zero` |
| `/command-center` | `/lab/command-center` |
| `/self-evolution` | `/lab/self-evolution` |
| Factories | `/lab/frontend-factory`, `backend-factory`, `qa-factory`, `database-factory`, `infrastructure-factory`, … |

---

## Lab inventory (52) — all **Lab**

`venture-intelligence`, `runtime-observability`, `live-mission`, `founder-zero`, `aurea-facilities`, `executive-runtime`, `infrastructure-factory`, `capabilities`, `developer-skills`, `ai-skills`, `build-context`, `live-ai`, `skills-governance`, `build-dna`, `website-factory`, `business-skills`, `autonomous-organization`, `self-evolution`, `execution-engine`, `runtime-scheduler`, `task-queue`, `release-manager`, `marketing-skills`, `ai-collaboration`, `skills`, `skill-store`, `executive-mesh`, `enterprise`, `productivity-skills`, `command-center`, `backend-factory`, `rc1`, `analytics-skills`, `state-machine`, `venture-factory`, `real-connections`, `ai-runtime`, `real-build-flow`, `database-factory`, `preview-runtime`, `ecosystem`, `build-registry`, `frontend-factory`, `network`, `qa-factory`, `os-rc2`, `preview-deployment`, `workers`, `real-execution`, `forge-capital`, `cloud-foundation`, `production-readiness`

Hub: `/labs`.

---

## OS shell (Supporting / Core OS)

`/os`, `/os/calendar`, `/os/portfolio`, `/os/creator`, `/os/knowledge`, `/os/capital`, `/os/settings`, `/os/marketplace`, `/os/workspace/[id]`, `/os/analytics`, `/os/build`, `/os/ceo`, `/os/labs`

---

## Auth / onboarding (Supporting)

`/login`, `/register`, `/forgot-password`, `/onboarding`, `/profile`

---

## Experience freeze note

PROGRAM 6000 does **not** rename or delete routes. Consolidation belongs to Program 6060 with redirects kept for compatibility.
