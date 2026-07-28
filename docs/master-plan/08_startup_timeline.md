# 08 — Startup Timeline

## Definición

**Startup Timeline** modela el ciclo de vida de un venture desde idea hasta exit, con gates, artefactos esperados y criterios de avance.

## Etapas

| # | Etapa | Objetivo | Artefactos clave |
|---|-------|----------|------------------|
| 1 | **Idea** | Capturar y clarificar | ideaText, tags iniciales |
| 2 | **Discovery** | Reducir ambigüedad | discoveryContext, preguntas/responses |
| 3 | **Research** | Entender mercado | researchReport |
| 4 | **Validation** | Decidir si proceder | Intelligence, Simulator, recomendación |
| 5 | **MVP** | Definir mínimo viable | productPRD, mvpScope |
| 6 | **Beta** | Probar con usuarios tempranos | feedback, métricas iniciales |
| 7 | **Launch** | Disponible públicamente | launch checklist, legal básico |
| 8 | **First Customers** | Primeros pagos o LOI | pricing validado |
| 9 | **Growth** | Escalar adquisición | experimentos, loops |
| 10 | **Scale** | Operaciones y equipo | procesos, hiring plan |
| 11 | **Fundraising** | Capital externo | investor pack, data room |
| 12 | **Exit** | Adquisición o cierre | outcome documentado |

## Diagrama de flujo

```
Idea → Discovery → Research → Validation
                                  │
                    ┌─────────────┼─────────────┐
                    ▼             ▼             ▼
              Do not build   Build small    Build
                    │             │             │
                    └─────────────┴─────────────┘
                                  ▼
                    MVP → Beta → Launch → First Customers
                                  │
                                  ▼
                    Growth → Scale → Fundraising → Exit
```

## Gates y criterios (orientativos)

| Transición | Gate mínimo |
|------------|-------------|
| Idea → Discovery | ideaText ≥ 15 caracteres |
| Discovery → Research | ≥ 1 respuesta Discovery o usuario fuerza |
| Research → Validation | researchReport existe |
| Validation → MVP | Recomendación build/build_small + PRD |
| MVP → Beta | Build Plan entregado + MVP scope acotado |
| Beta → Launch | QA sign-off (futuro) + legal básico |
| Launch → First Customers | Producto accesible públicamente |
| Growth → Scale | Retención positiva (hipótesis validada) |

## Integración con Decision System

En etapa **Validation**, el Simulator emite:

| Recomendación | Efecto en timeline |
|---------------|-------------------|
| `do_not_build_yet` | Permanece en Validation |
| `research_more` | Loop a Research |
| `pivot` | Nueva rama Idea/Discovery |
| `build_small_mvp` | Avanza a MVP (scope reducido) |
| `build` | Avanza a MVP (scope completo) |

## Estado en UI (roadmap)

| Componente | Descripción |
|------------|-------------|
| Timeline bar | Progreso visual en Venture Workspace |
| Stage badge | En portfolio y exports |
| Blocked indicator | Gate no cumplido |
| Suggested next | CEO recomienda siguiente etapa |

## v0.1

- Etapas implícitas (no hay UI de timeline completa)
- Validation cubierta por Intelligence + Simulator
- MVP cubierto por PRD + Build Plan

## Métricas por etapa (futuro)

| Etapa | Métrica orientativa |
|-------|---------------------|
| Discovery | % preguntas respondidas |
| Validation | Venture Score |
| Beta | N usuarios activos |
| First Customers | N pagos |
| Growth | MoM growth |

*Sin targets numéricos universales — dependen del vertical.*

## Principio

> El timeline no es burocracia — es **mapa compartido** entre fundador, CEO y Board.
