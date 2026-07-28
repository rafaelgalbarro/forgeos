# 10 — Worker Philosophy

## Qué es un Worker en ForgeOS

Un **Worker** es una unidad especializada con contrato uniforme:

```typescript
interface Worker {
  id, name, role,
  enabled: boolean,
  validate(context): Promise<boolean>,
  run(context): Promise<WorkerResult>,
  rollback(context): Promise<void>
}
```

Ubicación: `lib/workers/`

## Workers registrados (v0.1)

| ID | Rol | IA |
|----|-----|-----|
| research | Mercado y competidores | Opcional |
| product | PRD y roadmap | Opcional |
| architecture | Arquitectura | Stub |
| database | Esquema DB | Stub |
| backend | API design | Stub |
| frontend | UI structure | Stub |
| … | Go-to-market stubs | Stub |

## Orquestación

```
BuildFlow → runWorkflow() → executeWorker per step
         → runWorker() → orchestrator
         → metadata: knowledgeRefs, discoveryContext, researchReport
```

El orchestrator (`lib/workers/orchestrator.ts`):

1. Resuelve worker del registry
2. Inyecta knowledge refs automáticamente
3. Valida, ejecuta, rollback en error

## Filosofía de diseño

### Especialización

Cada worker hace **una cosa bien**. No mezclar research con código de backend en el mismo prompt.

### Secuencia deliberada

Research antes de Product — el mercado informa el MVP.

### Duración mínima perceptible

Workers IA tienen `minDurationMs` para UX de "pensamiento" sin mentir sobre latencia real.

### Stubs como placeholders

Workers de ingeniería generan contenido template hasta que se conecten generadores reales. **No bloquean** el flujo.

### Metadata explícita

Todo contexto cross-worker via `context.metadata`, no globals.

## Thinking mode

Antes de workers, BuildFlow muestra frases rotativas (`THINKING_PHRASES`) — capa UX, no cognitiva.

## Calidad de worker

- `success: boolean` + `output` tipado
- Errores capturados, no silent fail
- `fallbackUsed` trazado en meta de venture

## Futuro

- Workers paralelos donde no hay dependencia
- Workers human-in-the-loop (aprobación entre pasos)
- SDK agents como implementación de `run()`
