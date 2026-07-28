# Vercel Connection

**Env:** `VERCEL_TOKEN`

## Capabilities

- `deploy_software`
- `create_environment`

## Operations

| Operation | Mode | Description |
|-----------|------|-------------|
| validate | read-only | List projects |
| deploy_software | dry-run | Build + deploy plan |
| create_environment | dry-run | Environment + env vars plan |

## Rollback

`rollback_deployment` — revert to previous deployment.

No production deploy in RC5 default mode.
