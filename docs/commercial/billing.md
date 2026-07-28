# Facturación — Program 6000

## Modo dry-run (default)

Sin `ENABLE_STRIPE_BILLING=true`, todas las operaciones de checkout y portal son simuladas.

## Portal

`/billing` agrega:

- Suscripción activa
- Uso del periodo
- Facturas recientes
- Notificaciones de billing
- Cambio de plan (upgrade/downgrade)

## Stripe adapter

`lib/commercial/stripe-adapter.ts`:

- `createCheckoutSession()` — dry-run o live stub
- `createBillingPortalSession()` — portal simulado
- `getStripeMode()` — `"dry-run"` | `"live"`

## Persistencia

localStorage keys bajo `forgeos-commercial-*`. Ver `COMMERCIAL_STORAGE_KEYS` en config.

## Flujos

- **Upgrade**: `lib/commercial/upgrade-flow.ts`
- **Downgrade**: `lib/commercial/downgrade-flow.ts`
- **Trial**: `lib/commercial/trial.ts`
- **Cancelación**: `cancelSubscription()` en subscriptions.ts
