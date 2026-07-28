# ForgeOS First Experience

**Program:** 4255 — FORGEOS FIRST EXPERIENCE  
**Entry:** `/` → `components/home/FirstExperienceHome.tsx`

## Purpose

Orient new and returning founders with a lightweight home that answers *¿Qué quieres crear hoy?* without loading Executive Mesh, AI Runtime, or Build engines on first paint.

## Layout

1. **Hero** — welcome title, subtitle, creation question
2. **Four creation cards** — Empresa (live), Web/App/Móvil (próximamente until factory routes ship)
3. **Command Center CTA** — `/command-center` when authed + workspace; else `/onboarding` or `/register`
4. **CEO mini block** — venture pending, next task, main risk (from `lib/home/snapshot.ts`)
5. **Quick stats** — Ventures, Builds, Deploys, AI Providers, Health (counts only)

## Performance

- Hero and cards render immediately (no engine imports).
- `HomeInsightPanels` loads via `dynamic(..., { ssr: false })` after first paint.
- Snapshot uses `lib/ceo` + portfolio helpers only — no full Command Center loader.

## Navigation (4255)

Primary sidebar: Home, Command Center, Ventures, Marketplace, Capital, Production, Settings.  
Labs appears only in `NODE_ENV=development`. Demoted modules (CEO, Live, Build, Network) remain under **MÁS**.

## Legacy routes

`/dashboard`, `/founder`, `/creator` unchanged and reachable; not removed from the app.
