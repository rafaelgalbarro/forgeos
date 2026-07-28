# ForgeOS Real Connections (RC5)

Secure external tool integration layer for GitHub, Supabase, Vercel, and Cloudflare.

## Architecture

```
Capability Layer → Skills Governance → Connection Adapter → Provider Client
                                      ↓
                              Security (policy, audit, redaction)
```

## Security defaults

- **DRY_RUN** is the default mode for all operations
- Credentials read from `process.env` only (server-side)
- No tokens in API responses or logs (redaction enforced)
- Production execution requires: approval + risk clearance + `FORGEOS_CONNECTIONS_PRODUCTION=true` + user confirmation

## Providers

| Provider   | Env var                  | Capabilities                          |
|-----------|--------------------------|---------------------------------------|
| GitHub    | `GITHUB_TOKEN`           | create_repository, branch, PR, release |
| Supabase  | `SUPABASE_ACCESS_TOKEN`  | create_database                       |
| Vercel    | `VERCEL_TOKEN`           | deploy_software, create_environment   |
| Cloudflare| `CLOUDFLARE_API_TOKEN`   | configure_domain                      |

## API routes

- `POST /api/connections/test` — validate credentials (read-only)
- `POST /api/connections/dry-run` — generate execution plan
- `POST /api/connections/request-approval` — governance approval request

## Lab

`/lab/real-connections` — interactive dashboard (no production execution)
