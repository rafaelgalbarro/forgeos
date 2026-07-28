# 04 — Forge Brain

## Definición

**Forge Brain** es el cerebro central de ForgeOS: el conjunto de principios, heurísticas, contexto y reglas que guían cómo el sistema piensa, recomienda y genera artefactos.

No es un modelo LLM — es la **capa de gobernanza cognitiva** que envuelve workers y UI.

## Responsabilidades

| Área | Descripción |
|------|-------------|
| Principios | Valores del cofundador digital |
| Decisiones | Cuándo build, pivot, wait |
| Contexto | Qué información inyectar en cada worker |
| Calidad | Reglas anti-alucinación y honestidad |
| Memoria | Coordinación con Forge DNA |

## Componentes (mapa lógico)

```
Forge Brain
├── Principles (01)
├── Decision System (02)
├── Discovery Engine (03)
├── Founder Advisor (04)
├── Scoring (Startup + Venture)
├── Venture Simulator (07)
├── Research / Product Logic (08–09)
├── Worker Philosophy (10)
├── Knowledge Engine (11)
├── Forge DNA (12)
└── Quality Rules (13)
```

Especificación detallada: [`docs/brain/`](../brain/00_index.md)

## Implementación v0.1

| Módulo código | Rol Brain |
|---------------|-----------|
| `lib/intelligence/` | Análisis de idea, tags, mercado |
| `lib/discovery/` | Preguntas y contexto |
| `lib/venture-simulator/` | Scores y recomendación |
| `lib/brain/` | `getBrainContextForWorker()` |
| `lib/dna/` | Persistencia memoria proyecto |

## Orden de prioridad de contexto

1. Respuestas Discovery (`discoveryContext`)
2. Research Report generado
3. Venture Simulator result
4. Intelligence / heurísticas
5. Knowledge Engine (orientativo)

## Salidas del Brain

| Salida | Consumidor |
|--------|------------|
| Recomendación | UI Intelligence, Simulator |
| Preguntas Discovery | DiscoveryPanel |
| Contexto prompt | Research, Product, Build Plan |
| Scores | Simulator, exports |
| Stance Founder Advisor | UI challenge/proceed |

## Forge Brain vs AI CEO

| Forge Brain | AI CEO |
|-------------|--------|
| Reglas y heurísticas | Agente ejecutivo con agenda |
| Determinista + prompts | Razonamiento multi-paso (futuro) |
| v0.1 implementado | v2.0 roadmap |
| Base del sistema | Capa de orquestación superior |

El AI CEO **consume** el Brain; no lo reemplaza.

## Evolución

| Versión | Evolución Brain |
|---------|-----------------|
| v0.1 | Heurísticas + IA selectiva |
| v2.0 | CEO usa Brain como constitution |
| v3.0 | Board members con slices del Brain |
| v5.0 | Brain aprende de outcomes (hipótesis) |

## Principio rector

> El Brain no promete éxito — **reduce el riesgo de construir lo incorrecto**.
