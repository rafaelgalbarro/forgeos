# Live AI — Arquitectura

## Objetivo

Visualizar el pipeline completo de ForgeOS como un **centro de operaciones**, no como chat. El usuario ve simultáneamente CEO, Mesh, Departamentos, Skills, Capabilities, Runtime, Task Queue, Workers, Memory, Decision Graph, Research, Build y Timeline.

## Capas

```
┌─────────────────────────────────────────────────────────┐
│  UI — components/live-ai/                               │
│  LiveOperationsCenter, panels, LiveTimeline, InputBar   │
├─────────────────────────────────────────────────────────┤
│  Simulation — lib/live-ai/simulation-engine.ts          │
│  Async staged pipeline, event callbacks, dry-run only   │
├─────────────────────────────────────────────────────────┤
│  Runtime Bridge — lib/live-ai/runtime-bridge.ts         │
│  task-queue-lab, workers-lab, observability-lab         │
├─────────────────────────────────────────────────────────┤
│  Existing modules (read-only / lab harness)             │
│  executive-mesh, capabilities, runtime/*                │
└─────────────────────────────────────────────────────────┘
```

## Decisiones

### Simulación client-side

El motor `LiveAiSimulationEngine` corre en el cliente con `setTimeout` entre etapas. No hay API route obligatoria — evita ejecución server-side accidental.

### Reutilización de labs

`runtime-bridge.ts` importa los mismos harnesses que `/lab/task-queue`, `/lab/workers` y `/lab/runtime-observability`. Cuando funcionan, los paneles muestran datos reales del runtime in-memory.

### Paneles unificados

Todos los paneles comparten `PanelShell` en `panels.tsx` con estados `idle | active | done | error` y mensajes por etapa.

### Separación de `lib/live` vs `lib/live-ai`

- `lib/live` — actividad CEO office, timeline de ausencia (existente)
- `lib/live-ai` — RC5.5 demo pipeline (nuevo)

## Tipos clave

- `SimulationStageId` — 14 etapas del pipeline
- `LiveAiPanelId` — 13 paneles visibles
- `LiveAiSimulationState` — estado React completo
- `LiveAiRuntimeSnapshot` — datos runtime + mock fallback

## Seguridad

- `dryRun: true` fijo en `SimulationContext`
- No se invoca `runCapabilityRequest`, `runExecutiveProtocol` ni workers reales durante la simulación
- Comandos validados con `isStartupCommand()` antes de iniciar
