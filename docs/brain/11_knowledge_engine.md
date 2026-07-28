# 11 — Knowledge Engine

## Propósito

Proveer **contexto orientativo** estructurado — playbooks, patrones, prompts — sin afirmar verdad absoluta sobre el mercado del usuario.

## Ubicación

```
lib/knowledge/
  knowledge-store.ts    → catálogo en memoria
  knowledge-queries.ts  → getKnowledgeForWorker()
  prompts.ts            → PROMPT_CATALOG
  seed/                 → ~83 entradas iniciales
```

## Dominios típicos

- `marketplace`, `saas`, `gtm`, `product`, `legal`, `tech`
- Tags para filtrado por worker e idea

## API de consulta

`getKnowledgeForWorker(workerId, { limit })` devuelve entradas relevantes que el orchestrator convierte en `knowledgeRefs`:

```typescript
{ id, domain, title }
```

## Uso en prompts

Research y Product reciben entradas expandidas server-side:

```
formatKnowledgeContext(knowledgeEntries)
```

Regla en prompts: **orientativo, NO verdad absoluta**.

## Knowledge vs Discovery

| Knowledge | Discovery |
|-----------|-----------|
| Genérico, seed global | Específico del usuario |
| Patrones de industria | Respuestas a preguntas |
| Estático (v0.1) | Dinámico por venture |

## Bonus en Venture Score

+1 por knowledge ref usado (máx +5) — incentiva riqueza de contexto sin sobreponderar.

## Evolución

- Query semántica por embedding
- Entradas generadas por ventures exitosos
- Sync opcional con CMS/Notion
- API pública para terceros

## Anti-patrón

No usar Knowledge para **sobreescribir** respuestas explícitas del usuario en Discovery.
