# Deployment Flow — Program 4300

## Flow Overview

```mermaid
flowchart LR
  A[Feature branch] --> B[GitHub PR]
  B --> C[CI: build + lint]
  C --> D[Vercel Preview]
  D --> E[Staging gate]
  E --> F[Release branch]
  F --> G[Staging deploy]
  G --> H[Production gate]
  H --> I[Main merge]
  I --> J[Production deploy]
```

## Stages (Build Pipeline integration)

1. **Connections health** — verify GitHub, Vercel, Supabase, Cloudflare tokens
2. **Approval gate** — human approval required for real execution
3. **Dry run** — simulate full pipeline without side effects
4. **Risk assessment** — evaluate deployment risk
5. **GitHub repository** — scaffold or link repo
6. **Supabase project** — sandbox project setup
7. **Vercel project** — preview deployment
8. **Migration plan** — Supabase migrations
9. **Rollback plan** — recovery steps prepared
10. **Build report** — summary artifact

## Environment Routing

| Branch pattern | Target environment | Auto-deploy |
|----------------|------------------|-------------|
| `feature/*` | preview | Yes |
| `develop` | staging | No |
| `release/*` | staging | Yes |
| `main` | production | No (blocked) |

## Rollback

Rollback plan is wired to `lib/build-pipeline/rollback-plan.ts` which wraps `lib/real-build-flow/rollback-plan`. Steps include:

1. Revert Vercel deployment
2. Rollback Supabase migrations (if applicable)
3. Restore feature flags
4. Verify health checks
5. Notify team

## Current Mode

**Preparation only.** All deploys are dry-run or preview. Production is blocked by governance flags.
