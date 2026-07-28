# Live AI — Flujo del Pipeline

## Trigger

El usuario escribe un comando de startup en español o inglés:

- `Crea una startup de gestión de flotas`
- `Nueva startup SaaS B2B`
- `Create a startup for fleet management`

## Etapas (14)

| # | Etapa | Panel activo | Descripción simulada |
|---|-------|--------------|----------------------|
| 1 | CEO recibe | CEO | Recibe intent del fundador, prioriza en portfolio |
| 2 | Board debate | Executive Mesh | CTO, CFO, CMO debaten viabilidad |
| 3 | Research | Research | TAM, competidores, segmento |
| 4 | Product PRD | Departamentos | PRD MVP con features clave |
| 5 | Architecture | Departamentos | Stack técnico propuesto |
| 6 | Build | Build | Scaffolding app (dry-run) |
| 7 | Capability Layer | Capabilities | Capabilities routed sin ejecución |
| 8 | Skills | Skills | Skills github, vercel, stripe |
| 9 | Runtime | Runtime | Scheduler, event bus, health |
| 10 | Task Queue | Task Queue | Tareas encoladas RESEARCH→BUILD→MEMORY |
| 11 | Workers | Workers | Workers asignados por departamento |
| 12 | Memory | Memory | Registros research, decision, build |
| 13 | Decision Graph | Decision Graph | Founder→CEO→Board→Build→Memory |
| 14 | CEO entrega resultado | CEO | Resumen final al fundador |

## Animación

```
Usuario → LiveInputBar → LiveAiSimulationEngine.run()
                              │
                              ├─ stage_begin → highlight panel + timeline event
                              ├─ delay (700–1300ms)
                              ├─ stage_end → panel done
                              └─ completed → CEO result summary
```

## Datos en paneles

| Panel | Fuente |
|-------|--------|
| CEO | `SimulationContext.ventureName` |
| Mesh | `MESH_DEPARTMENTS` (board seats) |
| Departamentos | `MESH_DEPARTMENTS` |
| Research | Mensajes estáticos de demo |
| Build | Pasos de scaffolding |
| Capabilities | `listAllCapabilities()` |
| Skills | Tags de demo |
| Runtime | `createRuntimeObservabilityLab().seedDemo()` |
| Task Queue | `runTaskQueueDemo(createTaskQueueLab())` |
| Workers | `createWorkersLab().getWorkers()` |
| Memory | Mock records + runtime cuando disponible |
| Decision Graph | Nodos de demo con confidence |
| Timeline | Eventos del simulation engine |

## Cancelación

El usuario puede cancelar mid-pipeline. El engine setea `status: cancelled` y detiene el loop de etapas.
