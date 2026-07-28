# Venture Intelligence — Arquitectura

## Capas

```
VentureFinancialInputs
        │
        ▼
lib/venture-intelligence/  (motores heurísticos)
        │
        ▼
VentureIntelligenceSnapshot
        │
        ▼
lib/forge-capital/  (AI departments + composición)
        │
        ▼
ForgeCapitalSnapshot → UI (/capital, /investors)
```

## Motores

| Motor | Responsabilidad |
|-------|-----------------|
| `valuation-engine` | Valoración por múltiplo ARR + prima equipo |
| `runway-engine` | Meses de caja restantes |
| `burn-rate-engine` | Burn neto y cobertura de ingresos |
| `forecast-engine` | Proyección 12 meses |
| `fundraising-engine` | Necesidad de financiación |
| `due-diligence-engine` | Checklist y investor readiness |
| `risk-engine` | Riesgos principales |
| `growth-score` / `market-score` / `execution-score` | Scores compuestos |
| `exit-strategy` / `ma-engine` / `benchmark-engine` | Estrategia y comparables |
| `venture-scoring` | Orquestador principal |

## AI Departments

Conectados vía `lib/forge-capital/ai-departments.ts` al patrón `executeOrchestrationAi` cuando `ENABLE_REAL_AI=true`. Por defecto: insights heurísticos en español.

## Disclaimers

Toda salida estimada incluye `estimación heurística`. No se presentan datos como hechos verificados.
