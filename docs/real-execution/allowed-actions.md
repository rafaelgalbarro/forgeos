# Allowed Real Actions

Initial non-destructive actions only.

## GitHub

| Capability | Operation | Description |
|------------|-----------|-------------|
| `create_repository` | `create_repository` | Create private repository |
| `create_branch` | `create_branch` | Create feature branch (no push to main) |
| `open_pull_request` | `open_pull_request` | Open test PR (no merge to main) |

## Vercel

| Capability | Operation | Description |
|------------|-----------|-------------|
| `create_environment` | `create_environment` | Create preview project environment |
| `deploy_software` | `deploy_software` | Prepare preview deployment only |

## Supabase

| Capability | Operation | Description |
|------------|-----------|-------------|
| `create_database` | `create_database` | Sandbox project / prepare migrations |

## Cloudflare

| Capability | Operation | Description |
|------------|-----------|-------------|
| `configure_domain` | `configure_domain` | Validate zone, prepare DNS plan (no apply) |

## Max execution mode

Most actions: `sandbox`. Cloudflare DNS planning: `dry_run` only.

## Provider allowlist

Controlled by `REAL_EXECUTION_ALLOWED_PROVIDERS` (default: `github,vercel,supabase,cloudflare`).
