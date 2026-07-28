# Program 8000 — Customer Success Platform

Plataforma de customer success que extiende **Program 5000 (Design Partners)** sin duplicar lógica. La API pública vive en `lib/customer-success/` y delega en `lib/design-partners/`.

## Arquitectura

| Módulo | Delega en |
|--------|-----------|
| `customer-success-center.ts` | Agregador de snapshot (health, NPS, funnels, AI) |
| `nps-engine.ts` | `design-partners/success-dashboard` |
| `customer-health.ts` | `design-partners/customer-health` |
| `user-journey-analytics.ts` | `design-partners/journey-tracker` |
| `product-analytics.ts` | `design-partners/analytics` + `beta-platform/analytics` |
| `ai-usage-analytics.ts` | `design-partners/ai-usage-metrics` (solo lectura telemetría) |
| `executive-reports.ts` | `design-partners/executive-reports` |
| `ideas-portal.ts` | `design-partners/feature-requests` |
| `roadmap-feedback.ts` | `design-partners/roadmap-voting` |

## Rutas

| Ruta | Componente |
|------|------------|
| `/customer-success` | `CustomerSuccessCenter` |
| `/product-analytics` | `ProductAnalyticsDashboard` |
| `/nps` | `NpsDashboard` |
| `/feedback-center` | `FeedbackCenterHub` |
| `/executive-insights` | `ExecutiveInsightsPanel` |

## Variables de entorno

```env
ENABLE_CUSTOMER_SUCCESS_ANALYTICS=true
NEXT_PUBLIC_CS_PLATFORM=true
```

## Uso

```ts
import { getCustomerSuccessSnapshot } from "@/lib/customer-success";

const snapshot = getCustomerSuccessSnapshot();
console.log(snapshot.successScore, snapshot.nps.score);
```

## Almacenamiento

Todo en **localStorage** por defecto (mismo patrón que beta-platform y design-partners). Sin SDK externo de tracking.

## Relación con Program 5000

Program 8000 **no reemplaza** Program 5000. Añade una capa de agregación, embudos, insights ejecutivos y rutas dedicadas. Los datos siguen compartiendo las mismas claves de storage de design partners.
