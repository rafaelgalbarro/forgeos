# API comercial — Program 6000

## Claves API

UI: `/api-keys`

```typescript
import { createCommercialApiKey, listCommercialApiKeys, revokeCommercialApiKey } from "@/lib/commercial";
```

Claves almacenadas en localStorage. Prefijo `fos_`.

## Webhooks

```typescript
import { registerWebhook, listCommercialWebhooks, WEBHOOK_EVENTS } from "@/lib/commercial";
```

Eventos: `subscription.created`, `subscription.updated`, `invoice.paid`, `invoice.payment_failed`, `usage.threshold`.

## Public API types

Endpoints planificados (stub):

| Endpoint | Descripción |
|----------|-------------|
| `/api/v1/commercial/plans` | Listado de planes |
| `/api/v1/commercial/subscription` | Suscripción activa |
| `/api/v1/commercial/usage` | Contadores de uso |
| `/api/v1/commercial/invoices` | Facturas |
| `/api/v1/commercial/api-keys` | Claves API |

Ver `lib/commercial/public-api.ts`.

## Plan gating

Features comerciales requieren plan mínimo. Ver `COMMERCIAL_FEATURE_FLAGS` en `feature-flags.ts`.
