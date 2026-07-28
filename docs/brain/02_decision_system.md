# 02 — Sistema de decisión

## Propósito

Definir **cuándo ForgeOS recomienda construir, esperar, investigar o pivotar**.

## Estados de decisión

| Recomendación | Código | Cuándo |
|---------------|--------|--------|
| Build | `build` | Venture Score ≥68, Startup Score ≥60, stance ≠ challenge |
| Build small MVP | `build_small_mvp` | Score medio (48–67), viable con alcance reducido |
| Pivot | `pivot` | Stance challenge + score bajo, o Venture Score <42 |
| Research more | `research_more` | Falta Discovery/Research con score <45 |
| Do not build yet | `do_not_build_yet` | Venture Score <30 |

Implementación: `lib/venture-simulator/recommendations.ts`

## Pipeline de decisión

```
1. Entrada: ideaText + contextos opcionales
2. Discovery: ¿qué falta aclarar?
3. Intelligence: tags, mercado, Founder Advisor
4. Venture Simulator: scores + escenarios + recomendación
5. Usuario: acepta Intelligence → inicia Build Workflow
6. Post-build: Venture Workspace consolida decisión y artefactos
```

## Señales que pesan en la decisión

### Positivas

- ≥3 respuestas de Discovery
- Research Report con oportunidades claras
- PRD con MVP acotado (≤7 features)
- Stance `proceed` del Founder Advisor
- Wedge vertical confirmado

### Negativas

- Marketplace sin densidad local
- Competencia alta sin diferenciación
- Pagos en plataforma sin plan de disputas
- Idea <60 caracteres sin flujo descrito
- Riesgos `alta` ≥2 en Founder Advisor

## Confianza (Alta / Media / Baja)

No es probabilidad estadística — es **riqueza de contexto**:

| Nivel | Criterio aproximado |
|-------|---------------------|
| Alta | Intelligence + Discovery (≥3) + Research + score ≥60 |
| Media | Intelligence + algo de Discovery o Research |
| Baja | Solo idea + heurísticas básicas |

## Punto de no-retorno

El usuario cruza el punto al pulsar **"Aceptar y construir startup"** en Intelligence. Antes de eso, todo es reversible sin coste de workers.

## Integración con UI

- **Pre-build:** Intelligence Report + (futuro) Simulator embebido
- **Post-build:** Sección "Venture Simulator" en Venture Workspace
- **No bloquea:** el usuario puede build aunque la recomendación sea `do_not_build_yet`

## Evolución futura

- Pesos configurables por vertical
- Historial de decisiones en Forge DNA
- Feedback loop: "¿acertamos la recomendación?" post-lanzamiento
