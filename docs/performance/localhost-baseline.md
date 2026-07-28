# PROGRAM 4250 — Localhost Baseline (Before Fixes)

**Date:** 2026-07-12  
**Environment:** Windows 10, Node via `C:\Users\RafaelGalbarroBarba\AppData\Local\forgeos-node`, Next.js 15.5.19  
**Scope:** Pre–Program 4250 measurements captured at program start (before code changes).

---

## Build

| Metric | Value |
|--------|-------|
| `npm run clean && npm run build` | **~72–139 s** (compile phase ~45–72 s) |
| Build exit code | **Intermittent failures** on Windows (`ENOENT` during trace/export; `PageNotFoundError` during page-data collection when `.next` partially corrupted) |
| `.next` size (when present) | ~26 MB |
| Shared First Load JS | 102 kB (`chunks/1255` 46 kB + `4bd1b696` 54.2 kB) |

---

## Dev startup (`reset:dev`)

| Metric | Value |
|--------|-------|
| Kill ports + delete `.next` + start dev | ~3–5 s overhead (script steps) |
| Next.js **Ready** (cold `.next`) | **~2.7 s** |
| Notes | Full route compiles happen on first HTTP hit, not at Ready |

---

## First load times (cold dev, first HTTP hit after production build cache)

Measured via `Invoke-WebRequest` against running `dev:fast` (production `.next` present):

| Route | HTTP | TTFB (approx) |
|-------|------|---------------|
| `/` | 200 | 5120 ms |
| `/command-center` | 200 | 8108 ms |
| `/ventures/aurea-facilities` | 200 | 3997 ms |
| `/live` | 200 | 3413 ms |

Dev compile logs (first hit, same session):

| Route | Compile time | Modules |
|-------|--------------|---------|
| `/` | 4.2 s | 840 |
| `/command-center` | 7.4 s | **2369** |
| `/live` | 2.7 s | **2880** |
| `/ventures/aurea-facilities` | 1.9 s | **3118** |
| `/labs` | 0.6 s | 3243 |

---

## Production bundle sizes (pre-fix build, when successful)

| Route | Page | First Load JS |
|-------|------|---------------|
| `/` | 1.93 kB | 114 kB |
| `/command-center` | ~9 kB | **263 kB** |
| `/ventures/[slug]` | ~3 kB | **314 kB** |
| `/live` | ~1 kB | **252 kB** |
| `/labs` | 188 B | 106 kB |

---

## Node memory

| Metric | Value |
|--------|-------|
| Total `node.exe` WorkingSet (dev running) | **~829 MB** |

---

## Heavy import audit (critical routes)

### Root cause patterns

1. **Barrel imports** — `@/lib/navigation` re-exports `command-registry` (~200 lines of commands) alongside `LAB_LINKS`; `@/lib/command-center` pulls full engine; `@/lib/venture-e2e` re-exports `venture-e2e-engine`.
2. **Command Center** — `CommandCenterDashboard` called `runCommandCenterEngine()` on mount, synchronously loading CEO, mesh, AI runtime, build pipeline async, self-evolution engine, marketplace, organization, timeline.
3. **Live** — static import of `LiveOperationsCenter` → `@/lib/live-ai` simulation + runtime bridge on page load.
4. **Ventures** — static import from `@/lib/venture-e2e` barrel (engine re-export) for metadata/fixture resolution.
5. **UI barrel** — `@/components/ui/fhis` exports 40+ components including charts, dialogs, token demos.

### File-level findings

| File | Heavy imports |
|------|---------------|
| `app/page.tsx` | Light (`HomeHub` only) |
| `app/layout.tsx` | `AppShell`, `AuthProvider`, FHIS CSS — acceptable |
| `app/command-center/page.tsx` | `CommandCenterDashboard` → full CC engine |
| `app/live/page.tsx` | `LiveOperationsCenter` → `@/lib/live-ai` |
| `app/ventures/[slug]/page.tsx` | `@/lib/venture-e2e` barrel; dashboard already dynamic |
| `app/labs/page.tsx` | `@/lib/navigation` barrel (pulls command-registry) |
| `app/os/**` | Mostly light; `app/os/labs/page.tsx` same navigation barrel |
| `components/command-center/CommandCenterDashboard.tsx` | `@/lib/command-center`, `@/components/ui/fhis` barrel |

---

## `next.config.ts` review (no changes)

| Setting | Finding |
|---------|---------|
| `reactStrictMode: true` | Standard; no change |
| `webpack.cache.type: "memory"` (prod only) | Disables persistent webpack cache on production builds — may **increase** rebuild time but avoids Windows file-lock issues; not changed (unclear net win) |
| `webpackBuildWorker` | Not set (default). Program notes mention `false` on Windows — not present in this repo |
| Redirects | Single `/new-app` → `/`; negligible |

**Recommendation:** Keep config unchanged for 4250; revisit persistent cache only if Windows build trace failures persist.

---

## Scripts (pre-4250)

| Script | Behavior |
|--------|----------|
| `dev` | Start dev; auto-clean if production BUILD_ID detected |
| `reset:dev` / `dev:clean` | Kill ports + delete `.next` + dev |
| `clean` | Delete `.next` only |
| `build` | `next build` |
| *(missing)* | `dev:fast`, `build:clean` |
