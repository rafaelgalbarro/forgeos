# State Machines

Official machines under `src/core/events/state-machines/`:

Mission · Output · Codebase · Build · Preview · Release · Deployment · Decision · ExecutionNode

Each definition includes: **states**, **transitions**, **guards**, **events**, **terminal**, **recoverability**.

Mission and Output **re-export** PROGRAM 6010 transition helpers (`mission/transitions.ts`, `output/transitions.ts`) and align status vocabularies.

## Transition service

`createTransitionService()` / `getSharedTransitionService()` is the pure validator.

### Status mutation policy

**Prohibit** `entity.status = "READY"` (or any direct status write) outside:

1. Aggregate methods that call domain transition guards, or
2. The authorized transition service + subsequent event publish.

Enforcement:

- Architectural convention + `AUTHORIZED_STATUS_TRANSITION` marker
- `npm run architecture:check` heuristic scans for `.status = "READY"` / `.status='READY'` outside allowlisted paths (`src/core/domain/**`, `src/core/events/transition/**`, known deployment runners during migration)
