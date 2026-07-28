# API pública — ForgeOS 1.0 Launch

## Versión

`v1` — definida en `lib/commercial/public-api.ts`

## Endpoints indexados

Program 7000 expone referencia en `/demo` via `PublicApiDocsPanel`:

| Método | Path | Plan mínimo |
|--------|------|-------------|
| GET | `/api/v1/commercial/plans` | Starter |
| GET | `/api/v1/commercial/subscription` | Pro |
| GET | `/api/v1/commercial/usage` | Pro |
| GET | `/api/v1/commercial/invoices` | Business |
| POST | `/api/v1/commercial/api-keys` | Business |

## SDK

Enlaces públicos en `lib/forgeos-launch/public-sdk.ts`:

- `/sdk` — overview SDK
- `/marketplace` — plugins
- `/api-keys` — gestión de claves
- `/docs/quickstart` — guía de integración

## Notas

- Dry-run por defecto; Stripe deshabilitado salvo `ENABLE_STRIPE_BILLING=true`
- Documentación completa en portal `/docs` sección Comercial
