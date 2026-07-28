# ADR-004 — Event Model

**Status:** Accepted (directional freeze)  
**Date:** 2026-07-24  
**Program:** 6000

## Context

Audit finds parallel systems: Runtime Event Bus (typed, unversioned), FOS bus, Platform stub, Live Mission emitter, queue lifecycle emitter, append-only telemetry/governance logs, UI notify channels. Duplicate `MissionEvent` types exist. Telemetry is not domain events.

## Decision

1. **Do not create another Event Bus.**
2. Program **6040** introduces a unified **DomainEventEnvelope** by adapting/wrapping the existing Runtime bus (and bridging others as needed).
3. Do not convert telemetry or UI `emit()` into domain events.
4. Do not destructively rewrite historical live-mission logs in 6000.

## Consequences

- New cross-cutting signals use Runtime bus or approved envelope adapters only.
- Live Mission continues to show real activity during migration.
