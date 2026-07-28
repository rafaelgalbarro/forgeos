# Cloudflare Connection

**Env:** `CLOUDFLARE_API_TOKEN`

## Capabilities

- `configure_domain`

## Operations

| Operation | Mode | Description |
|-----------|------|-------------|
| validate | read-only | List zones |
| configure_domain | dry-run | Domain + DNS + SSL plan |
| dns_plan | dry-run | CNAME/A record preview |

## Rollback

`revert_dns` — restore previous DNS records.

No real DNS changes in RC5 default mode.
