# 11 — Knowledge Engine

## Definición

El **Knowledge Engine** es el catálogo estructurado de conocimiento orientativo que ForgeOS usa para enriquecer recomendaciones — verticales, patrones, anti-patrones, benchmarks cualitativos.

**No es fuente de verdad.** Siempre subordinado a Discovery y Research del venture concreto.

## Principio epistémico

```
Verdad del venture = Discovery + Research generado
Knowledge Engine   = orientación genérica ("en marketplaces suele…")
```

Etiquetar siempre como **orientativo** o **hipótesis** cuando no viene del research propio.

## Contenido del catálogo (visión)

| Categoría | Ejemplos |
|-----------|----------|
| Verticales | SaaS B2B, marketplace C2C, consumer app |
| Patrones | Freemium, usage-based, marketplace take rate |
| Anti-patrones | Marketplace sin wedge, MVP > 12 semanas |
| Checklists | GDPR básico, pagos Stripe Connect |
| Stacks | Recomendaciones por tipo (ya en Build Plan) |
| Competidores tipo | Categorías, no listas estáticas obsoletas |

## Implementación v0.1

| Estado | Detalle |
|--------|---------|
| Parcial | Heurísticas en `lib/intelligence/` |
| Brain context | `getBrainContextForWorker()` inyecta reglas |
| Catálogo formal | No existe DB de knowledge aún |

## API conceptual (futuro)

```typescript
interface KnowledgeQuery {
  vertical?: string;
  tags?: string[];
  stage?: TimelineStage;
  topic?: string;
}

interface KnowledgeSnippet {
  id: string;
  content: string;
  confidence: "orientative" | "validated";
  source: "forge" | "community" | "user";
}
```

## Fuentes de conocimiento (roadmap)

| Fuente | v |
|--------|---|
| Curado ForgeOS | v1 |
| Outcomes anonimizados de ventures | v4+ (opt-in) |
| Community marketplace | v8 |
| Integraciones externas (Crunchbase, etc.) | Enterprise |

## Uso por módulo

| Módulo | Uso Knowledge |
|--------|---------------|
| Intelligence | Tags y mercado preliminar |
| Research | Prompt context, no sustituye research |
| Product | Patrones MVP |
| Build Plan | Stacks por vertical |
| AI Board | Benchmarks cualitativos CFO/CMO |

## Reglas de calidad

1. **No inventar estadísticas** — "muchas startups fallan por X" sin cifra falsa
2. **Fecha de revisión** — snippets con `lastReviewed`
3. **Conflicto con Research** — gana Research del venture
4. **Transparencia** — UI puede mostrar "basado en catálogo Forge"

## Relación con Forge DNA

- Knowledge = genérico
- DNA = específico del venture

El DNA puede **referenciar** snippets aplicados: "aplicamos patrón wedge-vertical-01".

## Evolución

| Versión | Entrega |
|---------|---------|
| v1 | Heurísticas documentadas en Brain |
| v3 | Catálogo JSON versionado en repo |
| v6 | Knowledge editable por enterprise |
| v8 | Marketplace de playbooks |

## Referencia

- [`docs/brain/11_knowledge_engine.md`](../brain/11_knowledge_engine.md) — spec operativa
