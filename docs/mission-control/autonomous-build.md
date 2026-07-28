# PROGRAM 5500 — Autonomous Build

Ejecución autónoma de misiones en Mission Control con puertas de aprobación solo para acciones críticas.

## Objetivo

Permitir que Mission Control continúe trabajando sin interacción constante del usuario. El modo autónomo procesa la cola de tareas secuencialmente y solo se detiene para aprobaciones críticas.

## Arquitectura

```
AutoPilotToggle (Continuar automáticamente)
        │
        ▼
autonomous-orchestrator.ts  ← tick loop cada 2s
        │
   ┌────┴────┬──────────────┬─────────────┐
   ▼         ▼              ▼             ▼
mission-   mission-    mission-      approval-
workers    checkpoints  pause/resume   gates
   │         │              │             │
   └────┬────┴──────────────┴─────────────┘
        ▼
 event-emitter.ts → liveMission events
        │
   ┌────┴────────────────┐
   ▼                     ▼
AutonomousBuildPanel   MissionApprovalModal
MissionActivityPanel   (conversación CEO)
```

## Módulos (`lib/mission-control/autonomous-build/`)

| Módulo | Responsabilidad |
|--------|-----------------|
| `types.ts` | AutonomousState, MissionWorker, Checkpoint, ApprovalGate, ApprovalReason |
| `autonomous-orchestrator.ts` | Loop principal: dequeue → run → checkpoint → continue/pause |
| `mission-workers.ts` | Workers virtuales (CEO, Research, CTO, factories) |
| `mission-checkpoints.ts` | Save/restore en localStorage por fase |
| `mission-resume.ts` | Reanudar desde último checkpoint |
| `mission-pause.ts` | Pausa usuario o sistema |
| `mission-approval.ts` | Detectar gates, UI, resume on approve |
| `approval-gates.ts` | Reglas deploy/spend/delete/irreversible |
| `autonomous-queue.ts` | Cola extendida + ETA |

## Puertas de aprobación

Solo detienen el flujo autónomo para:

| Reason | Detección | Ejemplo |
|--------|-----------|---------|
| `deploy` | Fase DEPLOY, patrones deploy/despliegue/producción | "Deploy a producción" |
| `spend` | Patrones gasto/pago/suscripción/CFO | "Activar suscripción" |
| `delete` | Patrones borrar/eliminar/delete | "Eliminar activos" |
| `irreversible` | Patrones irreversible/permanente | "Acción no reversible" |

Todas las demás tareas se ejecutan automáticamente cuando auto mode está ON.

## Flujo worker/queue

1. `buildAutonomousQueue()` crea tareas desde `factoryProgressSteps` + fases
2. `scheduleNextTask()` asigna la siguiente tarea Queued → Running
3. `startWorkerOnTask()` asigna worker virtual por departamento
4. `advanceWorkerTask()` incrementa progreso 25% por tick
5. Al completar: checkpoint en boundary de fase, avanza fase si aplica
6. Si gate detectado antes de ejecutar: pausa + `approval_required` event
7. Usuario aprueba vía modal, conversación (sí/no), o Decision Center

## UI

- **AutoPilotToggle** — "Continuar automáticamente" con estado ON/OFF claro
- **AutonomousBuildPanel** — Tarea actual, completadas, siguiente, ETA
- **MissionApprovalModal** — Autorizar/Cancelar para gates
- **MissionActivityPanel** (5300) — Feeds y logs en paralelo (no bloquea conversación)

## Persistencia

- `mission.autonomous` en Mission object
- `forgeos-autonomous-state-{missionId}` en localStorage
- Checkpoints: `forgeos-autonomous-checkpoint-{missionId}`

## Integraciones extendidas

- `auto-pilot.ts` — wired a orchestrator (backward compat)
- `conversation-engine.ts` — CEO pregunta breve sí/no en approval
- `decision-center.ts` — gates → pending decisions importantes
- `mission-persistence.ts` — persist autonomous state + checkpoints
- `live-mission/event-emitter.ts` — worker/checkpoint/approval events

## Reglas

1. Extender Mission Control only — NO nuevos engines
2. Conversación siempre interactiva
3. Light snapshots, non-blocking
4. Lazy `dynamic()` imports en UI
