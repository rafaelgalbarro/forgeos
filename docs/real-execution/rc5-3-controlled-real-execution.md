# RC5.3 — First Controlled Real Execution

**RC5.3 First Controlled Real Execution COMPLETADO EN MODO SEGURO.**

## Allowed real actions

| Provider | Actions |
|----------|---------|
| **GitHub** | Private repo, README (auto_init), branch `forgeos/initial-build`, test PR |
| **Vercel** | Validate token, list projects, preview plan |
| **Supabase** | Validate token, list projects, sandbox migration plan |
| **Cloudflare** | Validate token, list zones, DNS plan (no apply) |

## Blocked always

- delete / destroy / drop / production deploy
- production database changes
- DNS apply
- payments, public emails, campaigns
- secrets in frontend / token logging

## Flags (all default `false`)

```env
ENABLE_REAL_EXECUTION=false
ENABLE_REAL_BUILD_FLOW=false
ENABLE_REAL_GITHUB_EXECUTION=false
ENABLE_REAL_VERCEL_EXECUTION=false
ENABLE_REAL_SUPABASE_EXECUTION=false
ENABLE_REAL_CLOUDFLARE_EXECUTION=false
REAL_EXECUTION_REQUIRE_APPROVAL=true
REAL_EXECUTION_DEFAULT_ENVIRONMENT=preview
REAL_EXECUTION_ALLOW_DESTRUCTIVE=false
```

## Pipeline (10 gates)

1. Dry-run previo
2. Risk Engine
3. Permission Engine
4. Human approval
5. Execution Guard (`provider-execution-guard.ts`)
6. Provider health
7. Audit log
8. Rollback plan
9. Telemetry (via connection adapters)
10. Memory / Decision Graph (via existing runtime adapters)

## Tokens (server `.env.local` only)

- `GITHUB_TOKEN`
- `VERCEL_TOKEN`
- `SUPABASE_ACCESS_TOKEN`
- `CLOUDFLARE_API_TOKEN`

## Activate real execution

1. Set tokens in `.env.local` (never commit)
2. `ENABLE_REAL_EXECUTION=true`
3. Enable per-provider flags (e.g. `ENABLE_REAL_GITHUB_EXECUTION=true`)
4. Run dry-run in `/lab/real-build-flow`
5. Request + approve human approval
6. Click **Ejecutar acción real aprobada**

## Return to dry-run

Set all `ENABLE_REAL_*` flags to `false` and restart server.

## Security checklist

- [ ] All flags false in production until reviewed
- [ ] Tokens only in server env
- [ ] Approval required
- [ ] Rollback plan validated
- [ ] No DNS apply
- [ ] No production deploy
- [ ] Audit log reviewed after each run

## Lab

`/lab/real-build-flow` — mode, flags, health, guards, simulate + execute buttons
