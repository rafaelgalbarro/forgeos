# PROGRAM 6040 — Unified Event and State Model

Every relevant ForgeOS change must be traceable through a **canonical event envelope**, official **state machines**, and **rebuildable projections**.

## Critical rules

- **Do not** create another Event Bus — wrap existing Runtime / FOS / Live Mission buses.
- **Do not** destructively migrate historical events — wrap with `originalPayload` / `sourceEventRef`.
- **Do not** convert telemetry into domain events.
- **Do not** store chain-of-thought or secrets in payloads.
- **Zero** React/Next in `src/core/events/` (adapters may import `lib/` types only).
- Coordinate **additively** with Programs 6000–6030.

## Module map

| Path | Role |
|------|------|
| `src/core/events/envelope.ts` | `DomainEventEnvelope` |
| `src/core/events/catalog/` | Separated catalogs (domain / application / integration / telemetry / UI) |
| `src/core/events/state-machines/` | Official machines + re-exports of domain transitions |
| `src/core/events/transition/` | Pure transition service |
| `src/core/events/bus/` | Canonical bus **adapter** over existing buses + event log |
| `src/core/events/adapters/` | Legacy → envelope adapters |
| `src/core/events/store/` | `EventLogRepository` (memory / localStorage / file) |
| `src/core/events/projections/` | Light read models |
| `src/core/events/idempotency/` | `ProcessedEventRegistry` |
| `src/core/events/versioning/` | Upcasters + deprecated mapping |
| `src/core/events/observability/` | Duration / failures / dead-letter |
| `src/core/events/timeline/` | Mission timeline from **real** events only |

## Docs

- [event-envelope.md](./event-envelope.md)
- [catalog.md](./catalog.md)
- [state-machines.md](./state-machines.md)
- [projections.md](./projections.md)
- [idempotency.md](./idempotency.md)
- [versioning.md](./versioning.md)
- [legacy-events.md](./legacy-events.md)

## Source of truth layers

| Layer | Role |
|-------|------|
| **Domain aggregates** | Authoritative current state |
| **Event log** | Append-only audit / timeline / debug / partial recovery / projection rebuild |
| **Telemetry** | Performance & reliability signals — never domain facts |
| **UI notifications** | Presentation only |

This is **not** full event sourcing. Aggregates remain source of truth; the log is complementary.
