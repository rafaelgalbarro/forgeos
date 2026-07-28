# Program 5000 — Design Partner Program

ForgeOS Design Partner Program prepara la plataforma para los primeros usuarios reales. Extiende la infraestructura beta (Sprint 6) sin duplicar motores técnicos.

## Objetivo

Validar hipótesis de producto con design partners mediante:

- Invitaciones (org + workspace)
- Feedback, issues y feature requests
- Votación de roadmap
- Analytics de journey y uso AI
- Customer success (NPS, retención, activación)
- Informes ejecutivos

## Rutas

| Ruta | Descripción |
|------|-------------|
| `/design-partners` | Dashboard principal |
| `/customer-success` | NPS, retención, activación |
| `/analytics` | Eventos y telemetría AI |
| `/roadmap` | Votación de roadmap |
| `/feedback` | Formulario + inbox |

## Módulos (`lib/design-partners/`)

- `invitation-system.ts` — invitaciones org/workspace (extiende beta invitations)
- `feedback-center.ts` — agregación del inbox
- `roadmap-voting.ts` — votos sobre `PUBLIC_ROADMAP`
- `issue-reporting.ts` / `feature-requests.ts`
- `analytics.ts` — eventos DP + bridge a beta analytics
- `ai-usage-metrics.ts` — telemetría de `lib/ai-runtime`
- `journey-tracker.ts` — embudo Landing→Analytics
- `customer-health.ts` / `success-dashboard.ts` / `executive-reports.ts`

## Configuración

```env
DESIGN_PARTNER_MODE=true
NEXT_PUBLIC_DESIGN_PARTNER_MODE=true
ENABLE_DESIGN_PARTNER_ANALYTICS=true
NEXT_PUBLIC_ENABLE_DESIGN_PARTNER_ANALYTICS=true
```

## Almacenamiento

Todo usa **localStorage** por defecto (sin SDK externo). Compatible con beta platform storage keys.

## Documentación

- [workflows.md](./workflows.md) — flujos de usuario
- [analytics.md](./analytics.md) — eventos y métricas
- [invitations.md](./invitations.md) — sistema de invitaciones
