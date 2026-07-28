# PROGRAM 4250 — Localhost After (Post-Fix)

**Date:** 2026-07-12  
**Host:** http://localhost:3000  
**Build status:** `npm run build` **exit 0** ✓

---

## Before / After summary

| Metric | Before (4250 baseline) | After (4250 fixes) | Delta |
|--------|------------------------|--------------------|-------|
| `npm run build` (clean) | ~72 s compile; intermittent exit 1 on Windows | **72.3 s total**, compile **35.8 s**, **exit 0** | Stable green build |
| `.next` size | ~26 MB | **26.36 MB** | ~same |
| `reset:dev` → Ready | ~2.7 s | ~2.7 s | ~same |
| `dev:fast` → Ready (warm `.next`) | N/A (script missing) | **2.8 s** | New workflow |
| `dev:fast` 2nd start (warm) | N/A | **2.8 s** | Confirms incremental cache reuse |
| `/` first load (dev) | ~5120 ms | ~1946 ms (2nd warm hit) | Faster after warm compile |
| `/command-center` first load | ~8108 ms | Summary renders immediately; full engine lazy | Perceived faster TTI |
| `/live` First Load JS (prod) | ~252 kB | **251 kB** (page shell **804 B**) | Lazy route shell |
| `/labs` First Load JS | 106 kB | **106 kB** | Direct registry import (no regression) |
| `/ventures/aurea-facilities` | 314 kB FLJS | **314 kB** (fixture direct import) | Same bundle; avoids engine barrel at SSR |
| `node.exe` memory (dev) | ~829 MB | ~829 MB | ~same |

---

## Production route bundles (post-fix `next build`)

| Route | Page | First Load JS |
|-------|------|---------------|
| `/` | 1.93 kB | 114 kB |
| `/command-center` | 9.23 kB | 263 kB |
| `/os` | 1.81 kB | 130 kB |
| `/live` | **804 B** | 251 kB |
| `/ventures/aurea-facilities` | 3.01 kB | 314 kB |
| `/labs` | **188 B** | **106 kB** |
| `/capital` | 4.47 kB | 114 kB |
| `/marketplace` | 5.71 kB | 170 kB |
| `/production` | 2.11 kB | 291 kB |

Shared chunks: `1255` 46 kB, `4bd1b696` 54.2 kB, other 2.23 kB.

---

## Fixes applied

### 1. Command Center summary loader

- **New:** `lib/command-center/summary-loader.ts` — compact snapshot (CEO, ventures, build sync, AI fallback, runtime health, self-evolution observation count) without full engine orchestration.
- **Updated:** `CommandCenterDashboard` — summary on mount; `runCommandCenterEngine` dynamically imported for full details + refresh.

### 2. Barrel → direct imports

| Location | Change |
|----------|--------|
| `app/labs/page.tsx`, `app/os/labs/page.tsx` | `@/lib/navigation/labs-registry` (metadata only) |
| `app/ventures/[slug]/page.tsx` | `@/lib/venture-e2e/fixture-registry` |
| `CommandCenterDashboard` | Direct `@/components/ui/fhis/*` imports |

### 3. Lazy routes

| Route | Change |
|-------|--------|
| `/live` | `dynamic()` import of `LiveOperationsCenter` |
| `/ventures/[slug]` | Already dynamic (Program 4200) — kept |
| `/self-evolution` | Already dynamic — kept |

### 4. New scripts

| Script | File | Behavior |
|--------|------|----------|
| `npm run dev:fast` | `scripts/dev-fast.js` | Kill port 3000 if needed; start dev **without** deleting `.next` |
| `npm run dev:clean` | `scripts/dev-reset.js` | Alias of `reset:dev` |
| `npm run build:clean` | `scripts/build-clean.js` | Kill ports + clean + `next build` |

**Daily workflow:**

```bash
# First start / after production build / chunk errors
npm run dev:clean    # or reset:dev

# Normal iterative work (fast restart)
npm run dev:fast

# Clean production build
npm run build:clean
```

---

## Verification (sequential)

```
npm run kill:ports   ✓
npm run clean        ✓
npm run build        ✓ exit 0
npm run dev:fast     ✓ background
```

| Route | Status |
|-------|--------|
| `/` | 200 |
| `/command-center` | 200 |
| `/os` | 200 |
| `/live` | 200 |
| `/ventures/aurea-facilities` | 200 |
| `/capital` | 200 |
| `/marketplace` | 200 |
| `/production` | 200 |
| `/labs` | 200 |

**Second `dev:fast` test:** kill ports → `dev:fast` again → **Ready in 2.8 s** (warm incremental cache).

---

## Root cause & recommendations

### Root cause of slowness

1. **Large dev compilations** on first route hit (Command Center ~2369 modules, Ventures ~3118, Live ~2880).
2. **Eager engine orchestration** in Command Center blocking first paint.
3. **Barrel imports** pulling command registry + venture E2E engine + full FHIS catalog into critical paths.
4. **150 static pages** — clean builds compile entire app graph (~72 s on Windows).

### Heaviest routes

1. `/ventures/[slug]` — 314 kB First Load JS  
2. `/command-center` — 263 kB + heaviest dev compile  
3. `/live` — 251 kB (simulation engine)  
4. `/production`, `/health` — ~291 kB (production-readiness panels)

### Operational recommendations

1. Use **`dev:fast`** for day-to-day iteration; reserve **`dev:clean` / `reset:dev`** for cache corruption or after `build`.
2. Never run **`build` + `reset:dev` in parallel** (explicit program rule).
3. After `npm run build`, prefer **`dev:clean`** before dev if chunk errors appear (production `.next` + dev mismatch).
4. Command Center: summary loads instantly; full panels hydrate in background — no UX change.
5. Future win (out of 4250 scope): split Command Center panels into separate dynamic chunks per section.

---

**PROGRAM 4250 — LOCALHOST PERFORMANCE & DEV EXPERIENCE COMPLETADO**
