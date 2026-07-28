# Cloud Architecture — Program 4300

## Purpose

Cloud Foundation defines the infrastructure strategy for ForgeOS across GitHub, Vercel, Cloudflare, and Supabase. It is a **preparation layer** — configs, docs, stubs, and dry-run integration only.

## Components

```
lib/cloud-foundation/
├── types.ts              # Core types
├── config.ts             # Environment flags
├── github-strategy.ts    # Branch model
├── vercel-config.ts      # Preview/staging/prod mapping
├── cloudflare-config.ts  # DNS, SSL, WAF stubs
├── supabase-environments.ts  # Dev/staging/prod strategy
├── env-separation.ts     # Env var groups
├── secrets-management.ts # Secrets registry (no real secrets)
├── deployment-status.ts  # Build-pipeline adapter
├── release-history.ts    # Release log
├── rollback-prepared.ts  # Rollback plan stub
├── health-checks.ts      # Production-readiness adapter
└── cloud-dashboard.ts    # Dashboard aggregator
```

## Provider Stack

| Provider | Role | Environment mapping |
|----------|------|---------------------|
| GitHub | Source control, branch strategy | main → prod, develop → staging, feature/* → preview |
| Vercel | Frontend hosting | preview/staging/production targets |
| Cloudflare | DNS, SSL, WAF | Zone-level protection |
| Supabase | Database, auth, persistence | dev/preview/staging/prod projects |

## Integration Points

- **Build Pipeline** (`lib/build-pipeline`): Reads deployment snapshot, rollback plan, connection health
- **Production Readiness** (`lib/production-readiness`): Aggregated health checks
- **Persistence** (`lib/persistence`): Supabase provider configuration reference

## Safety Gates

- `CLOUD_DRY_RUN=true` — all operations are dry-run
- `CLOUD_PREVIEW_ONLY=true` — limited to preview environments
- `CLOUD_PRODUCTION_BLOCKED=true` — production deploys blocked
- Wired to build-pipeline `productionBlocked` policy

## UI

Dashboard at `/cloud` uses FHIS components (`Container`, `Panel`, `Grid`, `Badge`, `KpiBlock`) matching existing Production and Deployments patterns.
