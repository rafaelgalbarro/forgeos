# Vercel Preview

When `ENABLE_PREVIEW_VERCEL_DEPLOYMENT=true` and `VERCEL_TOKEN` configured:

- Validate token
- Create/link project
- Allowed env vars (non-secret only)
- Preview deployment (NOT Production Environment)
- Real preview URL after health check
- Smoke tests and logs

When false: **Vercel Preview Plan** with DRY RUN banner. No invented URLs.
