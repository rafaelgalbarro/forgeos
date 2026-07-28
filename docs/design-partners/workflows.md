# Workflows — Design Partners

## Journey principal

```
Landing → Waitlist → Invite → Register → Workspace → Venture → CEO → Build → Feedback → Analytics
```

Cada etapa se registra en `journey-tracker.ts` vía `advanceJourneyStage()` y se sincroniza automáticamente con `syncJourneyFromContext()` al cargar dashboards.

## Flujo de onboarding

1. Usuario llega a `/landing`
2. Se une a waitlist en `/waitlist` o `/beta`
3. Canjea invitación beta (`FORGE-BETA-2026`) u org/workspace (`FORGE-ORG-*`, `FORGE-WS-*`)
4. Registra cuenta en `/register`
5. Configura workspace en `/workspace`
6. Crea venture en `/venture-factory` o founder journey
7. Usa CEO workspace, build pipeline
8. Envía feedback en `/feedback`
9. Revisa métricas en `/analytics` y `/design-partners`

## Flujo de feedback

- **Beta feedback** — `lib/beta-platform/feedback.ts`
- **Issues** — `submitIssueReport()` en design-partners
- **Feature requests** — cola con votos
- **NPS** — encuesta en `/customer-success`

Todo se agrega en `feedback-center.ts` → `FeedbackInbox`.

## Flujo de hipótesis

1. Design partner usa el producto
2. Eventos se registran en analytics (localStorage)
3. Customer health score se calcula automáticamente
4. Equipo genera informe ejecutivo desde el dashboard
5. Roadmap se prioriza con votos en `/roadmap`

## Integración con beta existente

- No rompe rutas `/beta`, `/waitlist`, auth ni command-center
- Reutiliza adapters de beta-platform, auth y ai-runtime
- Sin nuevos motores AI
