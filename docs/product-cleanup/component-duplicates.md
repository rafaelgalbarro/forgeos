# FHIS Component Duplicates

**Program:** 4100 — Product Cleanup & UX Consolidation

## Card Family (similar layout, different domains)

| Component | Path | Purpose | Overlap |
|-----------|------|---------|---------|
| `Card` | `components/ui/fhis/Card.tsx` | Generic container | Base primitive |
| `CeoCard` | `components/ui/fhis/CeoCard.tsx` | CEO briefing block | Title + subtitle + content |
| `ExecutiveCard` | `components/ui/fhis/ExecutiveCard.tsx` | Executive avatar card | Header + body pattern |
| `VentureCard` | `components/ui/fhis/VentureCard.tsx` | Venture summary | Title + desc + tags |
| `WorkerCard` | `components/ui/fhis/WorkerCard.tsx` | AI worker status | Icon + name + status |
| `SimulatorCard` | `components/ui/fhis/SimulatorCard.tsx` | KPI metric tile | Title + value + delta |
| `KpiBlock` | `components/ui/fhis/KpiBlock.tsx` | KPI display | Similar to SimulatorCard |

**Recommendation:** Keep domain-specific cards; no merge in 4100 (label consolidation only).

## Layout Duplicates

| Component | Notes |
|-----------|-------|
| `PageTemplate` | Full page wrapper |
| `Container` / `Panel` / `Stack` in `Layout.tsx` | Composable layout primitives |
| `OsModuleFrame` | OS module page frame (used by Command Center, Labs) |

## Status / Badge

| Component | Notes |
|-----------|-------|
| `Status` | Dot + label status indicator |
| `Badge` | Text badge variants |
| `Progress` | Progress bar |

## Shell Duplicates

| Shell | Path | Used by |
|-------|------|---------|
| `ForgeOSShell` | `components/os/ForgeOSShell.tsx` | `/os/*`, `/command-center`, `/labs` |
| `AppShell` + `Sidebar` | `components/layout/` | Legacy app routes |
| `FounderJourneyShell` | `components/founder-journey/` | Founder/creator flows |

**4100 action:** Unified nav config; shells unchanged except routing expansion.

## Banner Components

| Component | Purpose |
|-----------|---------|
| `LegacyConsolidationBanner` | **New** — Command Center consolidation |
| `FounderJourneyShell` legacy banner | Journey redirects via `redirects.ts` |

## Action Taken (4100)

- No component merges (scope limit)
- New `LegacyConsolidationBanner` for consistent legacy UX
- Nav labels consolidated via `lib/navigation/nav-config.ts`
