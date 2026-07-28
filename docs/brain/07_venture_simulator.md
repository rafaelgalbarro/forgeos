# 07 — Venture Simulator

## Propósito

Proyectar **escenarios estratégicos y económicos** (conservador, base, optimista) antes o después del build, usando todo el contexto disponible.

## Ubicación

```
lib/venture-simulator/
  assumptions.ts      → modelo de negocio, usuarios base, CAC, churn
  scenario-builder.ts → 3 escenarios con multiplicadores
  metrics.ts          → Venture Score, LTV, break-even, riesgos
  recommendations.ts  → build / pivot / research more / …
  simulator.ts        → runVentureSimulator()
```

UI: `components/studio/VentureSimulatorPanel.tsx`  
Workspace: sección nav "Venture Simulator"

## Inputs

| Input | Obligatorio | Efecto |
|-------|-------------|--------|
| ideaText | Sí | Base de clasificación |
| discoveryContext | No | Bonos, hints monetización |
| intelligenceReport | No | Startup Score, stance, riesgos |
| researchReport | No | Competencia, oportunidades |
| productPRD | No | Bonus MVP acotado |
| knowledgeRefs | No | Bonus leve |

**Sin Research/Product:** funciona con heurísticas puras.

## Outputs por escenario

- Usuarios año 1 y 2
- Ingresos año 1 y 2
- CAC, LTV, conversión %, churn mensual %
- Break-even (meses) o null si no alcanzable
- Complejidad de adquisición
- Riesgo principal

## Multiplicadores de escenario

| | Conservador | Base | Optimista |
|---|-------------|------|-----------|
| Usuarios | ×0.55 | ×1 | ×1.65 |
| CAC | ×1.35 | ×1 | ×0.78 |
| Conversión | ×0.75 | ×1 | ×1.30 |
| Churn | ×1.25 | ×1 | ×0.82 |

## Recomendaciones

Ver `02_decision_system.md`. El simulador **no ejecuta** la recomendación — la muestra.

## Confianza

Basada en cantidad de fuentes de datos, no en precisión del modelo.

## Disclaimer obligatorio

> Simulación heurística. No sustituye modelos financieros ni validación con usuarios.

## Integración Brain

El Simulator es la **capa económica** del cerebro: traduce decisiones cualitativas en números orientativos para comparar escenarios.
