# Program 6000 — Commercial Readiness

Capa de comercialización para ForgeOS SaaS. Sin motores técnicos nuevos — adapters, stubs y dry-run billing por defecto.

## Módulos

| Módulo | Descripción |
|--------|-------------|
| `lib/commercial/plans.ts` | Planes Starter, Pro, Business, Enterprise |
| `lib/commercial/pricing-engine.ts` | Cotizaciones y matriz de funciones |
| `lib/commercial/subscriptions.ts` | Estado de suscripción (localStorage) |
| `lib/commercial/stripe-adapter.ts` | Adapter Stripe stub — sin cargos sin env |
| `lib/commercial/billing-portal.ts` | Agregador del portal de facturación |
| `lib/commercial/feature-flags.ts` | Features gated por plan |
| `lib/commercial/api-keys.ts` | Claves API comerciales |
| `lib/commercial/admin-metrics.ts` | MRR, ARR, churn, trials |

## Rutas

- `/pricing` — Precios y matriz de funciones
- `/billing` — Portal de facturación
- `/subscriptions` — Gestión de suscripción
- `/api-keys` — Claves API
- `/support` — Centro de soporte (enhanced)
- `/docs` — Portal de documentación
- `/status` — Estado del sistema (enhanced)

## Variables de entorno

```env
COMMERCIAL_MODE=true
ENABLE_STRIPE_BILLING=false
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
```

Stripe solo cobra si `ENABLE_STRIPE_BILLING=true` **y** ambas claves están configuradas.

## Componentes

`components/commercial/` — CommercialPricingView, BillingPortal, SubscriptionsPanel, ApiKeysPanel, AdminCommercialDashboard, UpgradeFlowModal, LegalHub.

## Docs

- [pricing.md](./pricing.md)
- [billing.md](./billing.md)
- [api.md](./api.md)
- [legal.md](./legal.md)
