# Secrets Management — Program 4300

## Principles

1. **No real secrets in the repository** — only placeholders in `.env.example`
2. **Registry stub** — `lib/cloud-foundation/secrets-management.ts` tracks which secrets are expected and whether they are present (boolean only)
3. **Per-environment separation** — secrets scoped to dev/preview/staging/production

## Secret Categories

| Category | Keys | Required (prod) |
|----------|------|-----------------|
| VCS | `GITHUB_TOKEN` | Yes |
| Deploy | `VERCEL_TOKEN` | Yes |
| DNS | `CLOUDFLARE_API_TOKEN` | Yes |
| Database | `SUPABASE_*_URL`, `SUPABASE_*_ANON_KEY` | Yes |
| Auth | `AUTH_SECRET` | Optional |
| Commercial | `STRIPE_SECRET_KEY` | Optional |

## Validation

The secrets registry checks `process.env` at runtime and reports:

- Total secrets defined
- Present vs missing
- Required missing count

Production Readiness also validates secrets via `lib/production-readiness/secrets-validation.ts`.

## Storage

- Server-side only — never expose tokens to client bundles
- Use Vercel/Cloudflare environment variable UI for deployment
- Local development: `.env.local` (gitignored)

## Placeholders in `.env.example`

All cloud secrets use commented placeholders. Copy to `.env.local` and fill with real values only in secure environments.
