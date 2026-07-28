# Performance — PROGRAM 6080

**Honesty rule:** Record only measured or explicitly unavailable items.

## Build / toolchain measurements

| Metric | Value | Evidence |
|--------|-------|----------|
| `npx tsc --noEmit` duration | ~54.2 s | `build-procedure-evidence.json` (typecheck step) |
| `npm run build` duration | ~72.8 s then FAIL | build-procedure-evidence |
| Typecheck result | FAIL | exit 2 |
| Production build result | FAIL | exit 1 after compile; typecheck phase |
| Bundle size (`.next`) | **UNAVAILABLE** | Build did not succeed; no certified chunk sizes |

## Runtime UX measurements

| Metric | Status |
|--------|--------|
| Initial page load | **UNAVAILABLE** — smoke NOT_RUN |
| Mission Control load | **UNAVAILABLE** — smoke NOT_RUN |
| Studio load | **UNAVAILABLE** — smoke NOT_RUN |
| Query / command latency | **UNAVAILABLE** — application layer does not build; no live timing |
| Heavy imports audit | **NOT AUTOMATED** in this run |
| Memory notes | **UNAVAILABLE** |
| Zombie processes | **NOTED** — after `kill:ports`, PIDs 31244, 27880, 31672 still observed; port 3000 IN_USE (PID 3300) during smoke attempt |
| Port cleanup | **PARTIAL** — `kill:ports` exit 0 but port 3000 remained in use |

## Orchestration estimates (not measured runtime)

`buildCanonicalMissionPlan` emits **ESTIMATED** cost/duration with confidence ~0.55 and fixture assumptions — mark as ESTIMATED, not performance evidence.

## Closure for performance certification

Re-run after green build + sequential `reset:dev`, capture:

1. Lighthouse or Next timing for `/`, `/mission-control`, `/studio/[id]`  
2. Largest `.next/static/chunks` sizes  
3. Confirm ports freed after kill:ports  
