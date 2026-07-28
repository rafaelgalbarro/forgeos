# Analytics — Design Partners

## Eventos Design Partner

| Evento | Descripción |
|--------|-------------|
| `dp_page_view` | Vista de ruta DP |
| `dp_journey_stage` | Avance en journey |
| `dp_feedback_view` | Vista de feedback |
| `dp_roadmap_vote` | Voto en roadmap |
| `dp_feature_request` | Nueva feature request |
| `dp_issue_report` | Issue reportado |
| `dp_nps_submit` | Respuesta NPS |
| `dp_dashboard_view` | Vista dashboard DP |
| `dp_executive_report_view` | Informe ejecutivo |

Storage key: `forgeos-dp-analytics`

## Bridge a Beta Analytics

Cada evento DP con `path` también dispara `trackBetaEvent({ event: "page_view", ... })` para compatibilidad con Sprint 6.

## Telemetría AI

`ai-usage-metrics.ts` lee de:

- `getAIRuntimeTelemetry()` — RC3 recorder
- `getExtendedTelemetry()` / `getTelemetrySummary()` — RC6

Métricas expuestas: requests, tokens, coste USD, latencia, fallbacks, errores, cache hits.

## Customer Success

- **NPS** — promotores (9-10) vs detractores (0-6)
- **Retención** — usuarios que llegan a etapa `analytics` / cohorte `landing`
- **Activación** — usuarios con venture / registrados

## Endpoint opcional

Si `ENABLE_DESIGN_PARTNER_ANALYTICS=true` y `DESIGN_PARTNER_ANALYTICS_ENDPOINT` está definido, los eventos se envían por POST (fire-and-forget).

Por defecto: solo localStorage, sin SDK externo.
