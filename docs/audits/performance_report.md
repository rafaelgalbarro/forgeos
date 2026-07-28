# ForgeOS Master Audit V1.0 — Performance Report

**Fecha:** 2026-07-07

## Build metrics

| Métrica | Valor | Umbral recomendado |
|---------|-------|-------------------|
| `next build` total | ~165s | < 120s |
| Webpack compile | ~64s | < 45s |
| Páginas generadas | 100 | — |
| First Load JS shared | 102 kB | OK |
| `webpackBuildWorker` | **false** (Windows fix) | Necesario en Win |

**Veredicto build:** **62/100** — funcional pero lento para iteración CI frecuente.

---

## Bundle & chunks

- Shared chunks estables: `1255-*.js` (46 kB), `4bd1b696-*.js` (54 kB).
- Páginas pesadas observadas en build anterior:
  - `/venture/[id]/knowledge` — ~21 kB page + 153 kB first load
  - `/store` — ~5 kB + 171 kB
  - `/venture-factory` — ~130 kB first load
- **Riesgo:** imports pesados desde home (`StudioHome` → intelligence + discovery) — no ai-runtime directo.

---

## Dev server

| Problema | Causa | Mitigación |
|----------|-------|------------|
| `Cannot find module './1331.js'` | `.next` corrupto (build+dev) | `reset:dev` limpia `.next` |
| `routes-manifest.json ENOENT` | Race build/dev paralelo | No build durante dev |
| EADDRINUSE :3000 | Múltiples agentes RC | `npm run kill:ports` |
| Primera compilación `/` | ~24s cold start | Esperado en dev |

---

## Rutas — latencia observada (dev, cold)

| Ruta | Observación |
|------|-------------|
| `/` | Compilación inicial ~24s |
| Labs complejos | 2–8s compile on demand |
| Batch 50 rutas audit | ~154s total (incluye compiles) |

**Nota:** en dev mode, primera visita compila — no representa producción.

---

## Streaming & IA latency

- `ENABLE_STREAMING=true` por defecto — simulación client-side en live-ai.
- Real provider latency: no medida sin API keys en audit.
- Model router v2 incluye `estimateLatency()` en adapters.

---

## Recomendaciones

| Prioridad | Acción | Impacto |
|-----------|--------|---------|
| CRÍTICO | CI: `npm run clean && npm run build` secuencial | Estabilidad |
| ALTO | Dynamic import en venture-factory / live-ai panels | -20% bundle |
| ALTO | Reducir páginas estáticas pre-beta (feature flags) | Build -30% |
| MEDIO | `next build` cache remoto (Vercel) | CI speed |
| MEDIO | Lighthouse CI en `/`, `/os`, `/venture-factory` | Regresiones |
| BAJO | Analizar `@next/bundle-analyzer` | Visibilidad |

**Puntuación performance:** **62/100**
