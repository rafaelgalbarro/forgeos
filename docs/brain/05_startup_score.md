# 05 — Startup Score

## Definición

**Startup Score** (0–100) estima la **viabilidad inicial** de una idea a partir de texto y señales heurísticas, antes de simulación económica completa.

## Ubicación

`lib/intelligence/startup-score.ts`  
`calculateStartupScore(text, tags, founderAdvisor, discoveryContext?)`

## Componentes del cálculo

| Factor | Ajuste típico |
|--------|---------------|
| Tag AI | +8 |
| B2B | +10 |
| SaaS | +5 |
| Marketplace | −12 |
| Stance challenge | −15 |
| Stance caution | −8 |
| Stance proceed | +5 |
| ≥2 riesgos alta | −10 |
| Oportunidad alta | +6 |
| Idea >80 chars | +4 |
| Ayudas públicas | −5 |
| Knowledge hints | variable |
| Discovery adjustment | ±8 (vía `getDiscoveryScoreAdjustment`) |
| Hash determinista | ±5 (consistencia por idea) |

## Etiquetas

| Rango | Label |
|-------|-------|
| ≥75 | Alta viabilidad |
| ≥55 | Viabilidad moderada |
| ≥35 | Riesgo elevado |
| <35 | Requiere pivote |

## Launch Priority

Derivado del score y riesgos altos:

- **alta** — score ≥65 y ≤1 riesgo alto
- **media** — score ≥45 y ≤2 riesgos altos
- **baja** — resto

## Diferencia con Venture Score

| Startup Score | Venture Score |
|---------------|---------------|
| Solo idea + advisor + tags | Idea + Discovery + Research + Product + escenarios |
| Preview en tiempo real | Simulator y workspace |
| Peso en Intelligence Report | Peso en recomendación build/pivot |

## Uso en UI

- `AnalysisPanel` — preview en Studio Home
- Intelligence Report — anillo central de score
- Venture Simulator — tarjeta comparativa

## Limitaciones

- No usa datos financieros reales del fundador
- Marketplace penalizado por defecto (realista para cold start)
- Calibración manual, no ML
