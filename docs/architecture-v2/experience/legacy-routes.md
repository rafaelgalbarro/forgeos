# Legacy routes — PROGRAM 6060 classification

| Classification | Examples | Behavior |
|----------------|----------|----------|
| **Redirect** | (none forced in 6060 for primary MC) | Prefer soft links + banners |
| **Legacy accessible** | `/founder`, `/command-center`, `/dashboard`, `/creator`, `/ceo` | Reachable; discrete banner → Mission Control |
| **Lab** | Factories primary pages, `/labs/*`, self-evolution | Secondary/advanced/lab nav + banner |
| **Removed after migration** | Reserved — **do not remove** without redirects |

## Banners

`components/experience/LegacyExperienceBanner.tsx` on Command Center and factories. Founder retains `LegacyConsolidationBanner`.

## Nav status

Sidebar `status: "legacy" | "lab"` — not primary.
