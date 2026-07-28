# Navigation Map

**Program:** 4100 — Product Cleanup & UX Consolidation  
**Registry:** `lib/navigation/nav-config.ts`

## Primary Navigation (Sidebar main)

| Label | Route | Icon |
|-------|-------|------|
| Command Center | `/command-center` | ⌘ |
| Ventures | `/ventures/aurea-facilities` | ◫ |
| CEO | `/ceo` | ◉ |
| Live | `/live` | ● |
| Build | `/os/build` (+ Deployments child) | ⚒ |
| Capital | `/capital` (+ OS Capital child) | ◈ |
| Marketplace | `/marketplace` | ◇ |
| Network | `/network` | ⬡ |
| Production | `/production` | ✓ |
| Settings | `/settings` | ⚙ |

## Secondary Navigation

| Label | Route |
|-------|-------|
| Labs | `/labs` |
| Self Evolution | `/self-evolution` |
| Admin | `/admin` |
| Enterprise | `/enterprise` |
| Customer Success | `/customer-success` |

## Legacy Routes (hidden from main nav, still reachable)

| Route | Banner | Target CTA |
|-------|--------|------------|
| `/dashboard` | Yes | `/command-center` |
| `/founder` | Yes | `/command-center` |
| `/creator` | Yes | `/command-center` |

## Shell Routing

| Path prefix | Shell |
|-------------|-------|
| `/os/*` | ForgeOSShell |
| `/command-center`, `/labs`, `/ventures/*` | ForgeOSShell (4100) |
| `/`, `/landing`, `/login`, etc. | Immersive (no sidebar) |
| Other app routes | Legacy Sidebar shell |

## Home (`/`)

- **Authenticated:** CTA → `/command-center`
- **Anonymous:** Landing / Login / Beta links
- **No heavy engines** on home page

## OS Sidebar Additions

- Command Center CTA at top of OS sidebar
- Labs removed from founder primary nav (secondary `/labs` only)

## Command Palette

Unified commands in `lib/navigation/command-registry.ts`, wired into `lib/os/commands.ts`.
