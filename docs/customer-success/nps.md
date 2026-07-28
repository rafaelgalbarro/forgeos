# NPS — Customer Success Platform

## Motor NPS

`lib/customer-success/nps-engine.ts` delega en `lib/design-partners/success-dashboard.ts`.

Storage key: `forgeos-dp-nps`

## Cálculo

- **Promotores**: puntuación 9-10
- **Pasivos**: puntuación 7-8
- **Detractores**: puntuación 0-6
- **NPS** = `((promotores - detractores) / total) × 100`

## API

```ts
import {
  submitNpsResponse,
  listNpsResponses,
  getNpsScore,
  getNpsBreakdown,
} from "@/lib/customer-success";

submitNpsResponse({ score: 9, comment: "Gran producto" });
const nps = getNpsScore(); // { score, responses, promoters, detractors }
```

## UI

Ruta `/nps` — `NpsDashboard` con historial y formulario de encuesta.

La ruta `/customer-success` incluye encuesta NPS rápida integrada en el centro principal.

## Eventos

Al enviar NPS se registra evento `dp_nps_submit` en analytics de design partners.
