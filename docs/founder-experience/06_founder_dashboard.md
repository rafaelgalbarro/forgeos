# Epic 7.6 — Founder Dashboard

Founder-oriented Venture OS panel at `/founder`. Progressive alternative to the technical `/dashboard` route.

## Objective

Give founders an executive home without runtime, workers, scheduler, or event bus language.

## Route

| Route        | Component              | Audience   |
|-------------|------------------------|------------|
| `/founder`  | `FounderDashboardView` | Founder OS |
| `/dashboard`| `DashboardView`        | Unchanged  |

## Sections (Spanish labels)

1. **CEO** — heuristic executive brief (`lib/portfolio/ceo-briefing`)
2. **Empresas** — venture cards from portfolio store
3. **Prioridades** — ranked next actions
4. **Portfolio** — KPI metrics row
5. **Build** — high-level construction status per venture
6. **Capital** — investment readiness heuristic
7. **Calendario** — daily agenda
8. **Actividad** — recent portfolio activity

## Architecture

```
app/founder/page.tsx
  └─ components/founder-dashboard/FounderDashboardView.tsx
       └─ lib/founder-dashboard/buildFounderDashboardData(getVentures())
```

## Constraints

- No `lib/runtime/*` imports
- No build-platform imports in client bundle
- FHIS design system (`styles/fhis/components.css`)
- `/dashboard` remains untouched

## Related

- `lib/founder-dashboard/README.md` — module reference
- Epic 7.0 Venture Workspace — per-venture detail
- Epic 7.2 CEO Workspace — deeper executive patterns (not required on critical path)
