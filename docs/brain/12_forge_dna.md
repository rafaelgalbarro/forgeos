# 12 — Forge DNA

## Concepto

**Forge DNA** es la memoria estructurada del proyecto — decisiones, stack, constraints — persistida por `projectId` para que workers futuros mantengan coherencia.

## Ubicación

```
lib/dna/
  dna-store.ts      → localStorage
  dna-builder.ts    → buildProjectDNA()
  types.ts
```

## Cuándo se escribe

Durante BuildFlow, tras completar workers:

```typescript
buildProjectDNA(venture, sections, workersExecuted)
dnaStore.save(projectId, dna)
```

## Contenido típico

- Identidad del proyecto (nombre, categoría)
- Workers ejecutados
- Referencias a secciones generadas
- Metadatos de fuentes (ai/mock)

## Relación con venture

| Venture | DNA |
|---------|-----|
| Documento entregable al usuario | Memoria operativa interna |
| Secciones markdown | Estructura machine-friendly |
| Persistido en ventures store | Persistido en dna store |

## Mejora continua (visión)

1. Usuario edita sección en workspace
2. DNA registra delta
3. Re-run de worker específico con DNA actualizado
4. Simulator recalibra con aprendizajes

## v0.1 limitaciones

- No sincroniza automáticamente edits manuales
- Solo localStorage
- No versionado de DNA

## Principio

> El DNA no es backup — es **el genoma operativo** del venture para agentes futuros.
