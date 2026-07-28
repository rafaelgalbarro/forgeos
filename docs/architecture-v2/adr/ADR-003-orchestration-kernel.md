# ADR-003 — Orchestration Kernel

**Status:** Accepted (directional freeze)  
**Date:** 2026-07-24  
**Program:** 6000

## Context

Operational orchestration already exists under `lib/runtime/` (event-bus, scheduler, task-queue, workers, execution-engine, state-machine) with formal transition graphs in several subsystems. FOS adds a second kernel/bus. Program 6030 targets Orchestration Kernel V2 under `src/core/orchestration/**`. Creating another scheduler or bus would multiply debt.

## Decision

1. **Kernel V2 wraps/adapts** existing runtime orchestration — it is **not** created in PROGRAM 6000.
2. **No new schedulers** and **no new event buses**.
3. Mission Control remains the **product coordinator**; runtime remains the **operational executor**.

## Consequences

- 6030 must integrate with `lib/runtime`, not replace silently.
- Hidden scheduler listeners (event→tasks) must be preserved or explicitly re-homed.
