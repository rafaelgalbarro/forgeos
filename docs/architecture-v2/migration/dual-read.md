# Dual read

Implementation: `src/core/migration/dual-read.ts` (`DualReadService`).

## Behavior

1. If V2 query/domain flags are **off** → read legacy only (no fallback noise).
2. If flags **on** (or `forceDual` in tests):
   - Try V2
   - On hit: optionally compare with legacy; **record divergence** if mismatch (still return V2)
   - On miss/error: **fallback legacy**, **register fallback**, include inconsistency string

## Rules

- Never silently swallow V2 failures
- Never pretend consistency when `compare` reports a mismatch
- Telemetry: `recordFallback` / `recordDivergence` / `recordError`

## Adapters using dual-read

- `mission.reads` — `dualReadMission`
- `outputs` — `dualReadOutput`
- `decisions` — `dualReadDecision` (also dual-write for mutations)
