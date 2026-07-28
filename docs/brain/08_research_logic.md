# 08 — Research Logic

## Rol del Research Worker

Investigar **mercado y competencia** para una idea, produciendo un `ResearchReport` estructurado que alimenta Product y Venture sections.

## Ubicación

```
lib/workers/implementations/research.ts
lib/ai/research-provider.ts
lib/ai/prompts/research.ts
app/api/generate/research/route.ts
```

## Esquema de salida

```json
{
  "marketSummary", "targetSegments", "competitors[],
  "marketRisks", "opportunities", "differentiationAngles",
  "validationPlan", "recommendedNextQuestions"
}
```

## Fuentes de contexto (orden de prioridad)

1. **discoveryContext** — decisiones explícitas del usuario
2. **ideaText** + appType + targetCustomer
3. **knowledgeRefs** — entradas del Knowledge Engine (orientativas)

## Reglas del prompt

- No inventar TAM exacto ni funding rounds
- Marcar incertidumbre explícitamente
- JSON válido en español, sin markdown
- Insights accionables para fundador pre-MVP

## Modos de ejecución

| Modo | Condición |
|------|-----------|
| AI | `ANTHROPIC_API_KEY` presente |
| Mock | Sin key o fallo de API → `buildMockResearchReport()` |

## Integración workflow

1. Orchestrator inyecta `knowledgeRefs` en metadata
2. BuildFlow pasa `discoveryContext` desde venture
3. Resultado guardado en `venture.researchReport` + `researchMeta`

## Uso downstream

- **Product Worker** — contexto principal para PRD
- **Venture sections** — Mercado, Competidores
- **Venture Simulator** — riesgos, competencia, oportunidades

## No hace (v0.1)

- Scraping web en tiempo real
- Datos financieros verificados
- Actualización automática del report

## Evolución

- Conectores a Crunchbase, SimilarWeb (futuro)
- Research incremental tras lanzamiento MVP
- Validación humana de competidores sugeridos
