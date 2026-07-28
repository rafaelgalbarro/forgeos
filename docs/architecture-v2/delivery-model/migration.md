# Migration (non-destructive)

Script: `scripts/migrate-delivery-model-6050.ts` (also runnable via `npm run migrate:delivery-6050`).

## Dispositions

| Disposition | Meaning |
|-------------|---------|
| `migrated` | New canonical record created |
| `compatible` | Already present / no work |
| `incomplete` | Missing required fields |
| `conflict` | ID clash with different version |
| `orphaned` | Legacy ID without payload |
| `manual_review` | Adapter/exception needs human |

Legacy Creation Output and CodeProject stores are **not deleted**.
