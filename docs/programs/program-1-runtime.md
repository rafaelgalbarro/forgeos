# Program 1 — ForgeOS Runtime

**Status:** COMPLETE (Epic 4.5 + 4.6 — Runtime Kernel RC1)  
**Next:** [Program 3 — Build Platform](./program-3-build-platform.md)

**Objetivo:** Crear el kernel real de ForgeOS.

Ver [MASTER_ROADMAP.md](./MASTER_ROADMAP.md) para detalle completo.

## Epics

| Epic | Nombre | Ubicación | Estado |
|------|--------|-----------|--------|
| 4.0 | Event Bus | `lib/runtime/event-bus/` | Done |
| 4.1 | Runtime Scheduler | `lib/runtime/scheduler/` | Done |
| 4.2 | Venture State Machine | `lib/runtime/state-machine/` | Done |
| 4.3 | Worker Runtime | `lib/runtime/workers/` | Done |
| 4.4 | Task Queue | `lib/runtime/task-queue/` | Done |
| 4.5 | Execution Engine | `lib/runtime/execution-engine/` + `/lab/execution-engine` | Done |
| 4.6 | Observability & Self-Healing RC1 | `lib/runtime/observability/` + `/lab/runtime-observability` | Done |

## Dependencias

- Epic 4.5 coordina 4.0–4.4 + Memory — **Done** (Runtime Kernel RC1 complete).
- Epic 4.6 observa todo el runtime existente incluyendo execution-engine.
- No conectar observabilidad a Dashboard hasta validación en laboratorio.

## Runtime Kernel RC1

Epics 4.0–4.6 complete the ForgeOS Runtime Kernel:

**Event Bus → Scheduler → State Machine → Worker Runtime → Task Queue → Execution Engine → Observability → Memory / Decision Graph / Telemetry**

## Epic 4.6 — Observability (resumen)

Health probes, metrics, traces, alerts, recovery plans (manual), diagnostics. Lab en `/lab/runtime-observability`. Ver [epic-4-6-runtime-observability.md](./program-1-runtime/epic-4-6-runtime-observability.md).

## Epic 4.0 — Event Bus (resumen)

Pub/sub tipado con historial in-memory. Categorías: venture, CEO, Board, Build, Memory, Capital.

Eventos iniciales: `VENTURE_CREATED`, `DISCOVERY_COMPLETED`, `RESEARCH_COMPLETED`, `CEO_DECISION_CREATED`, `BOARD_CONSENSUS_REACHED`, `VENTURE_APPROVED`, `BUILD_REQUESTED`, `BUILD_COMPLETED`, `MEMORY_UPDATED`, `RISK_DETECTED`, `OPPORTUNITY_DETECTED`.
