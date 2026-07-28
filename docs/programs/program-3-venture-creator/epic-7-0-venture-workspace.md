# Epic 7.0 — Venture Workspace

Official founder command center. One workspace per venture at `/venture/[id]`.

## Architecture

- `lib/venture-workspace/` — data assembly (no runtime imports)
- `components/venture-workspace/` — FHIS section UI

## Founder Lifecycle Pipeline

Visual stepper shown in:

1. **VentureWorkspaceShell** — prominent panel below topbar (primary)
2. **VentureStatusSection** — repeated inside Estado del Venture

Stages (Spanish): Idea → Validación → Mercado → Producto → Construcción → Lanzamiento → Crecimiento

Mapped heuristically in `lib/venture-workspace/founder-lifecycle.ts` from venture store fields.

## Hidden (by design)

No Runtime, Workers, Event Bus, Scheduler, task queue, or execution engine UI.

## CEO Presentation

Director General via `ExecutiveCard` + `CeoCard` — executive prose, no chat bubbles.
