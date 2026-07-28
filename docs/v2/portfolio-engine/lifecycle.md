# Venture Lifecycle — Program 6110

## States

`IDEA` → `DISCOVERING` → `VALIDATING` → `PLANNING` → `BUILDING` → `READY_TO_LAUNCH` → `LAUNCHED` → `OPERATING` → `GENERATING_TRACTION` → `GENERATING_REVENUE` → `PROFITABLE` → `SCALING`

Side paths: `AT_RISK`, `PAUSED`, `ARCHIVED`, `CLOSED`, `FAILED`

## Transition record

Each transition stores: `actorId`, `reason`, `evidence`, `previousState`, `newState`, `timestamp`, optional `decisionId`.

## Implementation

`src/core/domain/portfolio/lifecycle.ts` — `canTransitionLifecycle()`, `isActiveLifecycle()`, `isTerminalLifecycle()`

No arbitrary jumps — invalid transitions return `DomainError.invalidTransition`.
