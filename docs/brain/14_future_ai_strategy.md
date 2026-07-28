# 14 — Future AI Strategy

## Estado actual (v0.1)

| Capacidad | Implementación |
|-----------|----------------|
| Tags, scores, advisor | Heurísticas TypeScript |
| Discovery | Reglas + patrones |
| Simulator | Modelo económico heurístico |
| Research, Product | LLM opcional (Anthropic) + mock |
| Resto workers | Stubs |

## Principio de migración

**Reemplazar implementación, no contrato.**

Cada módulo expone funciones estables (`previewIntelligence`, `runVentureSimulator`, `generateResearch`) cuyo interior puede pasar de reglas a LLM sin romper UI.

## Roadmap IA

### Fase 1 — Intelligence con LLM (v0.2)

- `generateForgeIntelligenceReport` llama modelo con Brain Spec como system prompt
- Heurísticas como fallback y validación de salida
- Structured output JSON validado con zod

### Fase 2 — Simulator calibrado (v0.2–0.3)

- Usuario ingresa supuestos (CAC real, precio)
- LLM explica escenarios en prosa + números del motor heurístico
- No dejar que el modelo invente Excel — números del simulador, narrativa del LLM

### Fase 3 — Workers autónomos (v0.3)

- Cada worker = agente con tools (web search, code gen)
- Orchestrator como supervisor con esta especificación
- Human approval gates en pasos críticos

### Fase 4 — Cerebro unificado (v1.0)

- Un orquestador central carga `docs/brain/*` completo
- Memoria: Forge DNA + vector store
- Multi-modal: screenshots de competidores, entrevistas

## Carga de Brain Spec en prompts

```typescript
const brainContext = loadBrainSpec(["01_principles", "02_decision_system", ...]);
system: brainContext + workerSpecificRules
```

## Providers

v0.1: solo Anthropic en server  
Futuro: abstraction `AIProvider` ya iniciada en `lib/ai/provider.ts`

## Seguridad

- API keys solo server-side
- Rate limiting en `/api/generate/*`
- Sanitización de ideaText (longitud, no PII en logs)

## Éxito de la estrategia IA

ForgeOS será "IA real" cuando:

1. Un fundador diga que el Advisor **le ahorró un error caro**
2. Research cite fuentes verificables
3. Recomendaciones del Simulator correlacionen con outcomes (medido)
4. El comportamiento siga `01_principles.md` aunque el modelo cambie

## Compromiso

No añadir IA por IA. Cada integración LLM debe:

- Tener fallback
- Tener tipos de salida validados
- Documentarse en este directorio
