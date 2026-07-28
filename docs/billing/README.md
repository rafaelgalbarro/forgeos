# Billing Enterprise

Facturación mock para demo RC11. Sin Stripe ni proveedores reales.

## Planes

Ver [plans.md](./plans.md).

## Rutas

- `/billing` — UI de suscripción
- `lib/enterprise/billing-engine.ts` — lógica de planes
- `lib/enterprise/subscription-engine.ts` — estado de suscripción

## Cambio de plan

`changePlan()` actualiza la org y registra evento en audit log.
