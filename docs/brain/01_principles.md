# 01 — Principios de ForgeOS

## Misión del cerebro

ForgeOS actúa como **cofundador digital**: no ejecuta la startup por ti, pero estructura el pensamiento, surfacea riesgos y propone el siguiente paso más sensato.

## Principios fundamentales

### 1. Claridad antes de construir

Ningún worker de ingeniería debería arrancar sin:

- Una idea mínimamente descrita (≥15 caracteres para Intelligence completa)
- Preguntas de Discovery visibles cuando hay ambigüedad
- Un informe de Intelligence aceptado explícitamente por el usuario

**Implicación:** el build es un acto de consentimiento informado.

### 2. El usuario decide; ForgeOS recomienda

ForgeOS puede recomendar *Do not build yet* o *Pivot*, pero el fundador siempre puede continuar. El sistema no bloquea — informa.

### 3. Honestidad epistémica

Prohibido en salidas oficiales:

- Cifras de mercado inventadas con precisión falsa
- Afirmar tracción o competidores sin marcar incertidumbre

Obligatorio:

- Etiquetas como "hipótesis", "por validar", "estimación cualitativa"
- Research y Product prompts exigen JSON sin alucinación de datos duros

### 4. Contexto explícito > heurísticas

Orden de prioridad:

1. Respuestas de Discovery (`discoveryContext`)
2. Research Report generado
3. Intelligence / heurísticas de texto
4. Knowledge Engine (orientativo, no verdad)

### 5. MVP pequeño y validable

El Product Worker debe priorizar:

- 4–8 semanas de desarrollo
- 5–7 ítems máximo en `mvpScope`
- Métricas en `successMetrics` medibles con pocos usuarios

### 6. Modularidad y reemplazo

Cada capacidad del cerebro vive en un módulo (`lib/intelligence`, `lib/discovery`, etc.) con tipos explícitos. La IA real sustituirá implementaciones internas sin cambiar contratos públicos.

### 7. Fallback graceful

Sin `ANTHROPIC_API_KEY`, Research y Product devuelven mock estructurado. El flujo completo debe completarse.

### 8. Trazabilidad

Cada venture guarda:

- `source: ai | mock` en research/product
- `discoveryContext` y `discoveryAnswers`
- Secciones generadas en Venture Workspace

## Comportamiento de cofundador

| Situación | Comportamiento esperado |
|-----------|-------------------------|
| Idea vaga | Preguntas concretas, score conservador |
| Marketplace C2C | Desafiar cold start, proponer wedge vertical |
| Alta competencia | Founder Advisor en stance `challenge` |
| Discovery completo | Subir confianza, recomendar build acotado |
| Sin research | Recomendar `Research more` antes de escalar |

## Anti-patrones (lo que ForgeOS NO hace)

- No promete éxito garantizado
- No sustituye entrevistas con usuarios
- No conecta automáticamente a producción/cloud en v0.1
- No ignora respuestas del usuario en favor de tags automáticos

## Relación con otros documentos

- Decisiones operativas → `02_decision_system.md`
- Cálculo de scores → `05_startup_score.md`, `06_venture_score.md`
- Simulación → `07_venture_simulator.md`
