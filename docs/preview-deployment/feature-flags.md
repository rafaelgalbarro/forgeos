# Feature Flags

All flags default to **false** in `.env.example`:

```env
ENABLE_PREVIEW_DEPLOYMENT=false
ENABLE_PREVIEW_GITHUB_PUSH=false
ENABLE_PREVIEW_VERCEL_DEPLOYMENT=false
ENABLE_PREVIEW_SUPABASE_SETUP=false
PREVIEW_DEPLOYMENT_REQUIRE_APPROVAL=true
PREVIEW_DEPLOYMENT_ENVIRONMENT=preview
PREVIEW_DEPLOYMENT_ALLOW_PRODUCTION=false
```

## Enabling Real Preview

1. Set `ENABLE_PREVIEW_DEPLOYMENT=true`
2. Enable per-provider flags as needed
3. Configure provider tokens (`GITHUB_TOKEN`, `VERCEL_TOKEN`, `SUPABASE_ACCESS_TOKEN`)
4. Obtain founder approval in UI
5. Health check must pass before `READY` status

Without flags/creds: full dry-run with `READY_WITH_PLAN` status.
