# Security

- Secret redaction via `lib/connections/security/secret-redaction`
- Blocked file patterns: `.env.local`, `credentials.json`, `*.pem`
- Content scan for API keys and private keys
- No secrets in git push
- `PREVIEW_DEPLOYMENT_ALLOW_PRODUCTION=false` by default
- Approval layer required (`PREVIEW_DEPLOYMENT_REQUIRE_APPROVAL=true`)
- Audit trail per deployment action
