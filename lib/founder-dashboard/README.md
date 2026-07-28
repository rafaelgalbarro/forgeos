# Founder Dashboard (Epic 7.6)

Progressive, founder-oriented Venture OS panel at `/founder`. Alternative to the technical `/dashboard` route.

## Principles

- **Founder language** — no runtime, workers, scheduler, or event bus terminology.
- **Heuristic data** — assembled from `getVentures()`, `lib/portfolio/*`, and `lib/venture-workspace/investment-readiness`.
- **No `lib/runtime/*`** — critical path stays client-safe and lightweight.

## Sections

| Section     | Module                    | Source                          |
|------------|---------------------------|---------------------------------|
| CEO        | `ceo-section.ts`          | `portfolio/ceo-briefing`        |
| Empresas   | `founder-dashboard-data`  | `portfolio/venture-status`    |
| Prioridades| `priorities-section.ts`   | `portfolio/next-action`         |
| Portfolio  | `portfolio-section.ts`    | `portfolio/portfolio-metrics`   |
| Build      | `build-section.ts`        | pipeline heuristics per venture |
| Capital    | `capital-section.ts`      | `venture-workspace/investment-readiness` |
| Calendario | `calendar-section.ts`     | agenda heuristics               |
| Actividad  | `activity-section.ts`     | `portfolio/activity-feed`       |

## Usage

```ts
import { getVentures } from "@/lib/store/ventures";
import { buildFounderDashboardData } from "@/lib/founder-dashboard";

const data = buildFounderDashboardData(getVentures());
```

## Route

- **Primary:** `app/founder/page.tsx` → `FounderDashboardView`
- **Unchanged:** `app/dashboard/page.tsx` → `DashboardView`
