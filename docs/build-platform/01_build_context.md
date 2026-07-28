# Epic 6.0 — Build Context

## Objetivo

Crear la **única fuente de verdad** para toda la AI Software Factory de ForgeOS. Todos los generadores futuros (arquitectura, UI, backend, QA, deployment) consumirán el objeto `BuildContext`.

## Arquitectura

```
VentureProject (read-only)
        ↓
context-adapter.ts
        ↓
context-builder.ts
        ↓
BuildContext (20 secciones)
        ↓
context-validator.ts
        ↓
context-store.ts + context-history.ts
```

## Módulo

`lib/build-platform/build-context/`

| Archivo | Rol |
|---------|-----|
| `types.ts` | Contratos y secciones oficiales |
| `build-context.ts` | Factory y scoring de completitud |
| `context-builder.ts` | Ensambla contexto desde venture |
| `context-validator.ts` | Validación heurística por sección |
| `context-merger.ts` | Fusiona contextos parciales |
| `context-store.ts` | Store en memoria por venture |
| `context-history.ts` | Historial de versiones |
| `context-adapter.ts` | Lectura read-only de módulos existentes |

## Secciones integradas

Discovery, Research, Competitors, Business Model, Brand, Users, Personas, Architecture, UX, Product PRD, Knowledge, Memory, Decision Graph, Workers, Build Plan, Deployment Target, Analytics, Security, Infrastructure, QA.

Cada sección expone:

- **data** — payload estructurado
- **origin** — módulo fuente (`discovery`, `research`, `product`, `runtime`, etc.)
- **status** — `empty` | `partial` | `complete` | `stale`
- **validation** — `valid`, `score`, `issues[]`

## Orígenes (adapters)

Los adapters **no modifican** Discovery, Research, Product ni Runtime. Solo leen:

- `VentureProject` y campos existentes
- `generateBuildPlan()` de `lib/build-plan` (lectura)
- Placeholders para Memory, Decision Graph y Workers (runtime)

## Validación

Reglas heurísticas:

- PRD vacío → error para build
- Build Plan ausente con PRD completo → error
- Research sin Discovery → info
- Security vacío → warning

`meta.readyForBuild` requiere PRD completo, build plan y arquitectura no vacíos, score ≥ 55%.

## Lab

`/lab/build-context` — visualiza contexto completo, secciones, origen, estado y validaciones.

## Límites actuales

- Sin persistencia en base de datos
- Memory / Decision Graph son stubs de runtime
- No conectado a generadores ni Execution Engine todavía

## Próximos pasos

- **Epic 6.1** — Architecture Generator consume `BuildContext`
- **Epic 6.0+** — Conectar Build Engine cuando Program 2 avance

## Aislamiento

No se modificó: Runtime (`lib/runtime/*`), Dashboard, Mission Control, AI Gateway, AI Orchestration.
