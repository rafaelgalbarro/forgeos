# Security

Security checks and event scanning for skill governance.

## Checks

- Unknown or disabled skills
- Production mode blocking
- Financial skill monitoring
- Credential leak detection in payloads
- Destructive cloud action warnings

## Security Score

Starts at 100, deducted for violations and warnings. Execution blocked when violations present.

## Security Events

Lab displays sample events: violations, warnings, and routine scans.

## Related Modules

- `security-engine.ts` — Core checks
- `execution-guard.ts` — Combines security + rate limits + sandbox
- `credentials-manager.ts` — Mock credential resolution
- `rate-limiter.ts` — Per-skill rate limiting (30/min default)

## API

- `runGovernanceSecurityCheck(params)` — Full security check
- `scanRecentSecurityEvents()` — Sample events for lab
