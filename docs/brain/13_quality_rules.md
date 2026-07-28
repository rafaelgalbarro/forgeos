# 13 — Quality Rules

## Reglas transversales de calidad

### Datos y claims

1. Nunca presentar estimaciones heurísticas como datos de mercado verificados
2. Distinguir `source: ai` vs `source: mock` en UI cuando aplique
3. Research/Product deben incluir `assumptions` y `risks` explícitos

### TypeScript y arquitectura

1. Tipos exportados en `types.ts` por módulo
2. Sin imports circulares entre discovery ↔ intelligence ↔ simulator
3. APIs server-side para únicos puntos con secrets (ANTHROPIC_API_KEY)

### UX

1. No bloquear flujo por recomendaciones negativas
2. Estados de carga honestos (thinking + workers)
3. Mobile: grids del Simulator colapsan a 1 columna

### Build

1. `npm run build` debe pasar antes de merge
2. Sin imports rotos
3. Fallback mock siempre funcional sin env vars

### Documentación

1. Cambio de comportamiento del cerebro → actualizar `docs/brain/`
2. Nuevos workers → entrada en `10_worker_philosophy.md`

## Checklist pre-release de módulo Brain

- [ ] Funciona sin datos opcionales (degraded mode)
- [ ] Funciona con todos los inputs
- [ ] Tipos públicos en index.ts
- [ ] Doc brain correspondiente actualizado
- [ ] No rompe Research/Product existentes

## Métricas de salida aceptables

| Módulo | Mínimo viable |
|--------|---------------|
| Discovery | ≥1 pregunta si idea ambigua |
| Intelligence | score + advisor si ≥15 chars |
| Simulator | 3 escenarios + recomendación |
| Research | JSON válido 8 campos |
| Product | mvpScope no vacío |

## Deuda conocida aceptable en v0.1

- Heurísticas en lugar de ML
- localStorage en lugar de DB
- Workers de ingeniería como stubs
