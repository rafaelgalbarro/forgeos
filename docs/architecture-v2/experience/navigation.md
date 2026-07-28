# Navigation — Experience Layer (PROGRAM 6060)

## Primary

| Item | Href |
|------|------|
| Mission Control | `/mission-control` |
| Ventures | `/ventures` |
| Studio | `/studio` |
| Company | `/company` |
| Activity | `/activity` |
| Settings | `/settings` |

## Advanced

| Item | Href |
|------|------|
| Labs | `/labs` |
| Administration | `/admin` |
| Architecture | `/docs` |
| Providers | `/ai` |

## Factories

Website / Mobile / Application Factory left **primary** navigation. They remain reachable under **secondary / lab** with discrete legacy banners.

## Source of truth

`lib/navigation/sidebar-items.ts` → `safe-navigation.ts` → `components/layout/Sidebar.tsx`

Command palette: `lib/navigation/command-registry.ts` + `components/experience/ForgeCommandPalette.tsx` (Cmd/Ctrl+K on AppShell routes).
