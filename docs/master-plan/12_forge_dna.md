# 12 — Forge DNA

## Definición

**Forge DNA** es la memoria estructurada y operativa de cada venture — el "genoma" que permite a workers y agentes futuros mantener coherencia sin releer todos los documentos.

## Diferencia con Venture Workspace

| Venture Workspace | Forge DNA |
|-------------------|-----------|
| Documentos para humanos | Estructura para máquinas |
| Markdown legible | JSON tipado |
| Editable en UI | Actualizado por workers + deltas |
| Exportable | Interno (+ snapshot export futuro) |

## Contenido del DNA

```typescript
// Conceptual — ver lib/dna/types.ts
interface ProjectDNA {
  projectId: string;
  ventureName: string;
  category: string;
  workersExecuted: string[];
  sections: SectionRef[];
  sources: { research: "ai" | "mock"; product: "ai" | "mock" };
  constraints?: string[];
  stack?: string[];
  decisions?: DecisionRef[];  // futuro
  version: number;
}
```

## Cuándo se escribe

| Evento | Acción DNA |
|--------|------------|
| Build Flow completa | `buildProjectDNA()` + save |
| Re-run worker | Append versión |
| Usuario override decisión | Log en decisions[] |
| Pivot | Nueva rama con parentId |

## Consumidores

| Consumidor | Uso |
|------------|-----|
| Workers | Contexto sin reparsear markdown |
| Build Plan | Stack y constraints |
| AI CEO | Historial para priorizar |
| AI Board | Brief automático |
| Export | Metadata en header |

## Versionado (roadmap)

| v0.1 | v4.0+ |
|------|-------|
| Snapshot único | Historial de versiones |
| Sin sync edits UI | Webhook on section edit |

## Principios

1. **DNA no es backup** — es estado operativo
2. **Inmutable por versión** — edits crean v+1
3. **Portable** — exportable en ZIP futuro como `dna.json`
4. **Privado por defecto** — no sale al marketplace sin opt-in

## Limitaciones v0.1

- Solo localStorage
- No sincroniza ediciones manuales de secciones
- Sin decision history integrado

## Relación con Master Plan

Forge DNA es el **puente** entre la visión de portfolio multi-venture y la ejecución técnica — cada venture en el portfolio tiene su propio DNA.

## Referencia

- [`docs/brain/12_forge_dna.md`](../brain/12_forge_dna.md)
- `lib/dna/`
