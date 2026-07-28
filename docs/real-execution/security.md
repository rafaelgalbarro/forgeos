# Security

## Principles

1. **Server-side only** — real execution, env access, and credentials stay on server
2. **No credential exposure** — all API responses pass through `redactObject()`
3. **Default deny** — `ENABLE_REAL_EXECUTION=false`
4. **No production by default** — sandbox/dry-run modes enforced
5. **Human approval** — mandatory when `REAL_EXECUTION_REQUIRE_APPROVAL=true`

## Guard gates

| Gate | Check |
|------|-------|
| `ENABLE_REAL_EXECUTION` | Flag must be true for real mode |
| `allowed_provider` | Provider in allowlist |
| `allowed_action` | Action in allowed list |
| `forbidden_check` | No destructive patterns |
| `human_approval` | Approved session |
| `risk_permitted` | LOW/MEDIUM only for real |
| `environment_permitted` | Not production |
| `rollback_exists` | Rollback plan valid |
| `permission_valid` | Governance permission |
| `provider_health` | Credential/health check |

## Accidental execution prevention

- Multiple independent gates must all pass
- Execute button disabled in lab until session approved
- Forbidden action patterns blocked at request build
- Connection adapters enforce policy via `enforceConnectionPolicy()`
- Production requires `FORGEOS_CONNECTIONS_PRODUCTION=true` (separate flag, also blocked by RC5.1)

## Environment variables

```env
ENABLE_REAL_EXECUTION=false
REAL_EXECUTION_ALLOWED_PROVIDERS=github,vercel,supabase,cloudflare
REAL_EXECUTION_REQUIRE_APPROVAL=true
```

Never commit real tokens. Use `.env.local` for `GITHUB_TOKEN`, etc.
