# ForgeOS Brain — Índice

**Versión:** 0.1  
**Estado:** Especificación viva (heurísticas + workers + IA selectiva)

## Propósito

Este directorio documenta **cómo piensa ForgeOS**: no es documentación de API ni de UI, sino la **especificación mental** del sistema — el “cerebro” que guía decisiones de producto, negocio y construcción.

## Mapa de documentos

| # | Documento | Contenido |
|---|-----------|-----------|
| 00 | [Índice](./00_index.md) | Este archivo |
| 01 | [Principios](./01_principles.md) | Valores y reglas del cofundador digital |
| 02 | [Sistema de decisión](./02_decision_system.md) | Cuándo construir, pausar o pivotar |
| 03 | [Discovery Engine](./03_discovery_engine.md) | Preguntas, respuestas y contexto |
| 04 | [Founder Advisor](./04_founder_advisor.md) | Desafío, riesgos y alternativas |
| 05 | [Startup Score](./05_startup_score.md) | Viabilidad inicial de la idea |
| 06 | [Venture Score](./06_venture_score.md) | Score compuesto pre-build |
| 07 | [Venture Simulator](./07_venture_simulator.md) | Escenarios económicos |
| 08 | [Research Logic](./08_research_logic.md) | Mercado y competencia |
| 09 | [Product Logic](./09_product_logic.md) | PRD y MVP |
| 10 | [Worker Philosophy](./10_worker_philosophy.md) | Orquestación y especialización |
| 11 | [Knowledge Engine](./11_knowledge_engine.md) | Catálogo y contexto |
| 12 | [Forge DNA](./12_forge_dna.md) | Memoria por proyecto |
| 13 | [Quality Rules](./13_quality_rules.md) | Estándares de salida |
| 14 | [Future AI Strategy](./14_future_ai_strategy.md) | Evolución hacia IA real |

## Flujo mental (resumen)

```
Idea → Discovery → Intelligence → Venture Simulator → Decisión
                              ↓
                    Build Workflow → Workers (Research → Product → …)
                              ↓
                    Venture Workspace + Forge DNA
```

## Audiencia

- Fundadores que usan ForgeOS
- Ingenieros que extienden el cerebro
- Futuros agentes IA que deban respetar estas reglas

## Convenciones

- **Heurística** = reglas deterministas en `lib/` (v0.1)
- **Worker** = unidad de trabajo especializada con contrato `Worker`
- **Contexto explícito** = decisiones del usuario (Discovery) > heurísticas > conocimiento genérico
