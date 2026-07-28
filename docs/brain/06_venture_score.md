# 06 — Venture Score

## Definición

**Venture Score** (0–100) es el score **compuesto** que combina Startup Score con la riqueza de contexto y penalizaciones de ejecución.

## Ubicación

`lib/venture-simulator/metrics.ts` → `calculateVentureScore()`

## Fórmula conceptual

```
Venture Score =
  Startup Score × 0.55
  + discoveryBonus (hasta +15)
  + researchBonus (+8 si hay report)
  + productBonus (+6 si hay PRD)
  + knowledgeBonus (hasta +5)
  − competitionPenalty (2–12)
  − complexityPenalty (0–10)
  + discoveryScoreAdjustment × 0.5
  + stance adjustments
  + bonuses por oportunidades / MVP acotado
```

## Bonificaciones por datos

| Fuente | Bonus |
|--------|-------|
| Cada respuesta Discovery | +3 (máx 15) |
| Research Report | +8 |
| Product PRD | +6 |
| Knowledge refs | +1 por ref (máx 5) |

## Penalizaciones

- Competencia alta (texto o ≥4 competidores en research)
- Complejidad técnica alta o pagos en plataforma sin plan
- Founder Advisor en `challenge` (−12) o `caution` (−6)

## Para qué sirve

1. Alimentar **recomendación** del Venture Simulator
2. Calcular **confianza** (junto con presencia de fuentes)
3. Comparar ventures en portfolio (futuro)

## No confundir con

- **Discovery Score** — claridad de definición
- **Startup Score** — viabilidad textual rápida
- **Métricas de escenario** — usuarios/ingresos proyectados

## Evolución

Venture Score v0.2 podría incorporar:

- Inputs del fundador (burn rate, runway)
- Benchmarks por vertical desde Knowledge
- Decaimiento temporal si el venture envejece sin validación
