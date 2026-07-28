# Host recovery — webpack `./1331.js` (Cannot find module)

**Date:** 2026-07-08  
**Project:** ForgeOS App Factory v0.1  
**Symptom:** `Cannot find module './1331.js'` in `.next/server/webpack-runtime.js`

## Root cause

1. **Stale / mixed `.next` artifacts** — A dev server or partial build left chunk references (e.g. `1331.js`) that no longer exist on disk after incremental compiles or interrupted builds.
2. **Build + dev overlap** — Node processes listening on **3000** during `next build` caused intermittent `PageNotFoundError` / missing `.next/types` and prerender failures (not missing source pages).
3. **`reset:dev` intentionally wipes `.next`** — `scripts/dev-reset.js` removes production build output before `next dev` to avoid **build + dev chunk mismatch** (documented in script output).

**Cache vs import:** Resolved by **cache/process hygiene** only. `app/page.tsx` is already light (`StudioHome` only); no heavy engine or barrel imports on home.

## Commands executed (sequential)

```powershell
$env:PATH = "C:\Users\RafaelGalbarroBarba\AppData\Local\forgeos-node;" + $env:PATH
cd C:\Users\RafaelGalbarroBarba\Projects\ForgeOS_App_Factory\ForgeOS_App_Factory_v0_1

netstat -ano | findstr ":3000"
netstat -ano | findstr ":3001"
npm run kill:ports

Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force node_modules\.cache -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force .turbo -ErrorAction SilentlyContinue
npm run clean

npm run kill:ports
npm run clean
npm run build   # exit 0 required before dev
npm run reset:dev
```

## Ports / PIDs

| Action | Port | PID |
|--------|------|-----|
| Initial `kill:ports` | 3000 | 18912 terminated |
| Mid-recovery (dev still running) | 3000 | 20212, 14828 terminated |
| **Active dev host (verified)** | **3000** | **11504** |

Port 3001: free throughout.

## Build

- **Final `npm run build`:** exit **0** (149 static pages generated).
- Earlier failed attempts: concurrent dev on 3000 + partial `.next` during typecheck/prerender.

## Routes verified (HTTP 200)

| Route | Status |
|-------|--------|
| `/` | 200 |
| `/os` | 200 |
| `/command-center` | 200 |
| `/live` | 200 |
| `/founder-zero` | 200 |
| `/ventures/aurea-facilities` | 200 |

Host: `http://localhost:3000`

## Files modified

- `docs/audits/host-recovery-1331.md` (this audit)
- **No application code changes** — `./1331.js` did not recur after clean rebuild + isolated dev.

## Operational rule (final)

1. **Never run `next dev` and `next build` at the same time** — always `npm run kill:ports` first.
2. **Recovery order:** `kill:ports` → hard delete `.next` / `node_modules/.cache` / `.turbo` → `npm run clean` → **`npm run build` (must succeed)** → **`npm run reset:dev`** (background).
3. Use **`C:\Users\RafaelGalbarroBarba\AppData\Local\forgeos-node`** prepended on `PATH` for Node/npm.
4. If `./1331.js` returns after a clean cycle, inspect **`app/page.tsx`** and replace barrel/heavy imports with direct paths or `dynamic(..., { ssr: false })` — minimal fix only.
