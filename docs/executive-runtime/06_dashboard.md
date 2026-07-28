# Dashboard Wiring (CEO Office)

## Scope

CEO Office section only — no FHIS redesign, no new routes.

## Components

- `components/dashboard/CeoBriefingCard.tsx` — async load via `getCeoOfficeBriefing()`
- `components/dashboard/DashboardView.tsx` — passes `ventures` to briefing card

## Badges

| Badge | Meaning |
|-------|---------|
| AI Generated | Live provider, validated output |
| Mock | No API keys; orchestration mock |
| Heuristic | Rules-based fallback |

Consensus level badge shown when board session completes (e.g. `HIGH CONSENSUS`).

## Portfolio ranking

`portfolio-ranking.ts` feeds highlights into briefing:

- Top venture
- Most critical (highest risk)
- Most promising (highest expected ROI)
- Needs attention (low confidence + high risk)

Displayed inside existing insight slots — no layout changes.

## Loading

Briefing shows heuristic shell immediately, then replaces with executive runtime result. Errors never break `/dashboard`.

## Observability

Dev console: `[Executive Observability]` info logs. Production: silent except user-facing badges.
