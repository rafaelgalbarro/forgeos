# Security — Real Build Flow

- `ENABLE_REAL_BUILD_FLOW=false` by default
- `REAL_BUILD_DEFAULT_ENVIRONMENT=preview`
- No production deploy, no DNS apply, no destructive ops
- Credentials via server env only
- API responses redacted via `secret-redaction`
- No Cloudflare DNS in RC5.2
