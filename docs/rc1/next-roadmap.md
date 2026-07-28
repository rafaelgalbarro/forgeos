# ForgeOS RC1 — Next Roadmap

Post-RC1 epics organizados por programa.

## Program 3 — Venture Platform (RC2)

| Epic | Objetivo |
|------|----------|
| 7.9 | Persistencia real (Supabase/Postgres) para ventures y timeline |
| 7.10 | Auth + multi-tenant (fundador / equipo / inversor) |
| 7.11 | Unificar VentureWorkspace legacy → VentureWorkspaceView |
| 7.12 | Knowledge Hub con búsqueda semántica y embeddings |
| 7.13 | Timeline con eventos en tiempo real (WebSocket) |

## Program 2 — Build Platform (RC2)

| Epic | Objetivo |
|------|----------|
| 6.9 | Export ZIP de blueprints (código generado descargable) |
| 6.10 | CI pipeline generator (GitHub Actions real) |
| 6.11 | Deploy adapter (Vercel/Railway API integration) |
| 6.12 | Quality gates conectados a tests reales |

## Program 1 — Runtime (RC2)

| Epic | Objetivo |
|------|----------|
| 4.7 | Worker runtime con cola persistente (Redis/BullMQ) |
| 4.8 | Executive Runtime → acciones reales sobre ventures |
| 4.9 | Observability export (OpenTelemetry) |

## AI & Intelligence

| Epic | Objetivo |
|------|----------|
| AI-1 | AI Gateway production (routing, cost guard, fallbacks) |
| AI-2 | Research/Product con LLM real y caché |
| AI-3 | CEO narrative generativa con memoria de portfolio |

## Capital & Ecosystem (Program 4-6)

| Epic | Objetivo |
|------|----------|
| CAP-1 | Investment readiness → dataroom export |
| MKT-1 | Marketplace de templates y ventures |
| CLD-1 | Forge Cloud — hosting managed de ventures |

## Hitos

```
RC1 (actual)  → Integración E2E VANDL, labs, docs
RC2           → Persistencia + auth + export real
RC3           → Deploy automatizado + runtime productivo
GA            → Marketplace + Forge Cloud
```

## Prioridad recomendada

1. **Persistencia** — desbloquea multi-sesión y deploy
2. **Auth** — requisito para cualquier entorno compartido
3. **AI Gateway production** — calidad de outputs
4. **Export/Deploy** — cerrar el loop Idea → Producción
