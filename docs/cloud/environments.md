# Environments — Program 4300

## Environment Matrix

| Environment | Purpose | Vercel target | Supabase project | Persistence |
|-------------|---------|---------------|------------------|-------------|
| development | Local dev + integration | development | forgeos-dev | local/supabase |
| preview | Feature branch previews | preview | forgeos-preview | supabase |
| staging | Release candidates | preview (staging domain) | forgeos-staging | supabase |
| production | Live users | production | forgeos-prod | supabase |

## Environment Variables

Each environment has a prefix for variable separation:

- `DEV_` — development
- `PREVIEW_` — preview
- `STAGING_` — staging
- `PROD_` — production

See `lib/cloud-foundation/env-separation.ts` for the full variable groups per environment.

## Configuration Flags

```env
CLOUD_DRY_RUN=true
CLOUD_PREVIEW_ONLY=true
CLOUD_PRODUCTION_BLOCKED=true
CLOUD_ACTIVE_ENVIRONMENT=preview
```

## Supabase Strategy

Defined in `lib/cloud-foundation/supabase-environments.ts`:

- References `lib/persistence/config.ts` for provider resolution
- Four logical projects (dev, preview, staging, prod)
- RLS enabled for all except development
- Migration counts tracked per environment

## Vercel Mapping

Defined in `lib/cloud-foundation/vercel-config.ts`:

- `vercel.json` configures git deployment rules
- Production deploys on `main` are disabled
- Feature and release branches auto-deploy to preview/staging
