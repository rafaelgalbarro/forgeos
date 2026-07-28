# Deployment Registry

A Deployment **always** references a published Release.

## Environments

`LOCAL` | `SANDBOX` | `PREVIEW` | `STAGING` | `PRODUCTION`

## Governance

- `PRODUCTION` requires `governed=true` and approval for real execution
- `dryRun=true` ⇒ `realExecution` must stay `false`
- Never declare real deployment for dry-run outcomes (`describeDeploymentOutcome`)

Adapter: `lib/preview-deployment` → `adaptPreviewDeployment`.
