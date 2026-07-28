# ADR-001 — Canonical Domain

**Status:** Accepted (freeze decision)  
**Date:** 2026-07-24  
**Program:** 6000

## Context

Evidence shows dual stacks: fat runtime models in `lib/*` (e.g. `Mission`/`MissionSession`, `VentureProject`, `Workspace`) and emerging `src/core/domain/**` stubs/entities (Program 6010). Exact bare types are missing for many concepts (Product, Build, Task, …) — only specialized variants exist. Treating either side as already-unified would be false.

## Decision

1. **V2 canonical entities** are defined only under `src/core/domain/**`.
2. **Runtime source of truth remains `lib/*`** until migration adapters are certified.
3. No new parallel canonical definitions in `lib/` or presentation.
4. Existing `lib` definitions are **legacy runtime contracts**, not deleted by this ADR.

## Consequences

- Program 6010 owns domain completion; 6000 freezes the rule.
- `check-canonical-redefinition.js` / `architecture:check` enforce direction.
- Premature SoT flip is forbidden.
