# Sidebar & Route Matrix — Navigation Stabilization

**Date:** 2026-07-13  
**Source of truth:** `lib/navigation/sidebar-items.ts`  
**Real sidebar component:** `components/layout/Sidebar.tsx`  
**OS shell sidebar (separate):** `components/os/OsSidebar.tsx` → `lib/os/navigation.ts` (`OS_NAV_ITEMS`)

## Duplicates consolidated

| Registry | Role | Status |
|----------|------|--------|
| `lib/navigation/sidebar-items.ts` | **Single source of truth** for AppShell sidebar | ✅ Canonical |
| `lib/navigation/nav-config.ts` | Re-exports `PRIMARY_NAV` / `SECONDARY_NAV` from sidebar-items | ✅ Thin adapter |
| `lib/navigation/command-registry.ts` | Command palette only (not sidebar render) | ✅ Separate concern |
| `lib/os/navigation.ts` | ForgeOS OS shell nav (`/os/*`) | ✅ Intentional duplicate surface |

## Primary navigation (PRINCIPAL)

| ID | Label | href | Route | HTTP | Status | Decision |
|----|-------|------|-------|------|--------|----------|
| home | Home | `/` | `app/page.tsx` | 200 | active | — |
| command-center | Command Center | `/command-center` | `app/command-center/page.tsx` | 200 | active | — |
| ventures | Ventures | `/ventures` | redirect → `/ventures/aurea-facilities` | 200 | active | Redirect to default venture slug |
| marketplace | Marketplace | `/marketplace` | `app/marketplace/page.tsx` | 200 | active | — |
| capital | Capital | `/capital` | `app/capital/page.tsx` | 200 | active | Child: `/os/capital` |
| production | Production | `/production` | `app/production/page.tsx` | 200 | active | — |
| settings | Settings | `/settings` | `app/settings/page.tsx` | 200 | active | — |

## Secondary navigation (MÁS)

| ID | Label | href | Route | HTTP | Status | Decision |
|----|-------|------|-------|------|--------|----------|
| labs | Labs | `/labs` | `app/labs/page.tsx` | 200 | lab | `developmentOnly` + `NEXT_PUBLIC_ENABLE_LABS` |
| ceo | CEO | `/ceo` | `app/ceo/page.tsx` | 200 | active | — |
| live | Live | `/live` | `app/live/page.tsx` | 200 | active | Lazy-loaded dashboard |
| build | Build | `/build` | redirect → `/os/build` | 200 | active | Redirect to OS build surface |
| network | Network | `/network` | `app/network/page.tsx` | 200 | active | LoadingState guard |
| self-evolution | Self Evolution | `/self-evolution` | `app/self-evolution/page.tsx` | 200 | active | Lazy-loaded dashboard |
| admin | Admin | `/admin` | `app/admin/page.tsx` | 200 | active | — |
| enterprise | Enterprise | `/enterprise` | `app/enterprise/page.tsx` | 200 | active | — |
| customer-success | Customer Success | `/customer-success` | `app/customer-success/page.tsx` | 200 | active | — |

## System items (sidebar chrome, not in PRINCIPAL/MÁS lists)

| ID | Label | href | Route | HTTP | Status | Notes |
|----|-------|------|-------|------|--------|-------|
| create-venture | Crear Venture | `/os/creator` | `app/os/creator/page.tsx` | 200 | active | CTA button in sidebar |
| forgeos-os | ForgeOS OS | `/os` | `app/os/page.tsx` | 200 | active | Footer link |
| — | CEO AI | — | — | — | active | Status pill only (no href) |

## Legacy routes (not in sidebar, must keep working)

| ID | Label | href | Route | HTTP | Status | Decision |
|----|-------|------|-------|------|--------|----------|
| dashboard | Dashboard | `/dashboard` | `app/dashboard/page.tsx` | 200 | legacy | Consolidation banner → Command Center |
| founder | Founder | `/founder` | `app/founder/page.tsx` | 200 | legacy | Crear Venture alternate entry |
| creator | Creator | `/creator` | `app/creator/page.tsx` | 200 | legacy | Suspense fallback present |

## Redirects added (`next.config.ts`)

| Source | Destination | Reason |
|--------|-------------|--------|
| `/ventures` | `/ventures/aurea-facilities` | Portfolio index without dedicated page |
| `/build` | `/os/build` | Canonical build surface under OS |
| `/new-app` | `/` | Pre-existing legacy redirect |

## Heavy imports removed / isolated

| Surface | Imports | Status |
|---------|---------|--------|
| `Sidebar.tsx` | `@/lib/navigation` (metadata + Link only) | ✅ No engines |
| `AppShell.tsx` | `Sidebar`, `ForgeOSShell` (route-based shell switch) | ✅ No engines in Sidebar path |
| Destination pages | Heavy dashboards lazy-loaded where needed | ✅ Unchanged internals |

## Guards added

| Component | Fix |
|-----------|-----|
| `NetworkDashboardView` | `return null` → `LoadingState` |
| `NetworkDashboard` | Already guarded (prior pass) |
| `SelfEvolutionDashboard` | Already guarded (prior pass) |

## New files

- `lib/navigation/sidebar-items.ts` — SidebarItem type + registry
- `lib/navigation/safe-navigation.ts` — href validation, legacy resolve, feature flags
- `components/ui/UnavailableState.tsx` — unavailable tool fallback with CTA to Command Center

## Modified files

- `lib/navigation/nav-config.ts` — re-exports from sidebar-items
- `lib/navigation/index.ts` — exports sidebar-items + safe-navigation
- `components/layout/Sidebar.tsx` — uses safe-navigation getters
- `next.config.ts` — `/ventures` and `/build` redirects
- `components/network/NetworkDashboardView.tsx` — LoadingState guard

## Verification results (2026-07-13)

**Build:** `npm run build` exit **0**  
**Dev:** `npm run reset:dev` → http://localhost:3000  
**HTTP:** **20/20** routes return 200

| Route | HTTP |
|-------|------|
| `/` | 200 |
| `/command-center` | 200 |
| `/ventures` | 200 (redirect → aurea-facilities) |
| `/marketplace` | 200 |
| `/capital` | 200 |
| `/production` | 200 |
| `/settings` | 200 |
| `/labs` | 200 |
| `/ceo` | 200 |
| `/live` | 200 |
| `/build` | 200 (redirect → /os/build) |
| `/network` | 200 |
| `/self-evolution` | 200 |
| `/admin` | 200 |
| `/enterprise` | 200 |
| `/customer-success` | 200 |
| `/founder` | 200 |
| `/dashboard` | 200 |
| `/creator` | 200 |
| `/os` | 200 |
