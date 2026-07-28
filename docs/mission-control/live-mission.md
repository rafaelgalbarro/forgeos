# PROGRAM 5300 — Live Mission

Actividad en tiempo real durante Mission Control sin bloquear la conversación.

## Objetivo

Mostrar visualmente cómo ForgeOS trabaja en vivo: cola de tareas, actividad por departamento, feeds de research/build/deploy, logs y timeline cronológico.

## Arquitectura

```
conversation-engine / mission-flow / factory adapters
                    │
                    ▼
            event-emitter.ts  ──► MissionEvent
                    │
        ┌───────────┼───────────┐
        ▼           ▼           ▼
  mission-queue  mission-feed  mission-logs
        │           │           │
        └───────────┼───────────┘
                    ▼
         live-mission-snapshot (SSR-safe)
                    │
        ┌───────────┴───────────┐
        ▼                       ▼
 MissionActivityPanel    LiveMissionTimeline
   (panel lateral)         (panel inferior)
```

## Módulos (`lib/mission-control/live-mission/`)

| Módulo | Responsabilidad |
|--------|-----------------|
| `types.ts` | MissionEvent, MissionTask, TaskStatus, FeedItem, DepartmentActivity, MissionLogEntry |
| `event-emitter.ts` | Registra acciones importantes → eventos (fire-and-forget) |
| `mission-queue.ts` | Cola de tareas con estados incrementales |
| `mission-feed.ts` | Agregador unificado de feeds |
| `mission-progress.ts` | Progreso % por fase |
| `department-activity.ts` | Snapshots CEO, Research, CTO, CMO, CFO, Legal |
| `research-feed.ts` | Stream de eventos research |
| `build-feed.ts` | Stream de eventos factory/build |
| `deployment-feed.ts` | Stream de eventos deploy/cloud |
| `mission-logs.ts` | Log append-only |
| `live-mission-snapshot.ts` | Builder ligero para SSR |
| `adapters/runtime-adapter.ts` | Hints read-only del Runtime público |
| `adapters/executive-mesh-adapter.ts` | Hints read-only del Executive Mesh |

## Estados de tarea

`Queued` | `Running` | `Waiting` | `Completed` | `Failed`

## Integraciones

- **mission-timeline.ts** — cada evento de timeline emite también un `MissionEvent`
- **mission-persistence.ts** — persiste `liveMission` por `missionId` en localStorage
- **conversation-engine.ts** — emite eventos en turnos user/CEO sin bloquear (async)
- **live-execution.ts** (5100) — progresión simulada Running→Completed vía timers

## UI

### MissionActivityPanel (panel lateral derecho)

- Mission Queue con badges de estado
- Department Activity con indicadores en vivo
- Barra de progreso de misión
- Tabs Research / Build / Deploy
- Mission Logs (scrollable, últimos N)

### LiveMissionTimeline (panel inferior, ancho completo)

Eventos cronológicos con timestamps estilo `10:01 Idea registrada`.

### Layout (`MissionControlShell.tsx`)

```
[Status + Decisions + Progress] | [Conversation] | [Mission Activity]
[==================== Timeline (full width) ====================]
```

La conversación central nunca se bloquea; las actualizaciones llegan vía React state y polling de snapshots.

## Reglas de eventos

1. Toda acción importante genera un `MissionEvent`
2. Todo evento aparece en Timeline inmediatamente (client state)
3. Sin tareas pesadas en cliente — progresión heurística o hints de adapters
4. Transiciones incrementales Running → Completed
5. Conversación interactiva durante todas las actualizaciones

## Adapters (solo lectura)

- Runtime: `@/lib/runtime/observability` (health, execution availability)
- Executive Mesh: `lib/mission-control/adapters/executive-mesh-adapter.ts` (summary only)

No se modifican internals de `lib/runtime/` ni `lib/executive-mesh/`.
