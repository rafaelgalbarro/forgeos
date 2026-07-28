# Cloud Foundation — ForgeOS

Program 4300 — Cloud Foundation documentation index.

## Overview

Cloud Foundation prepares ForgeOS for multi-environment cloud deployment without executing production deploys. It integrates read-only adapters from:

- `lib/build-pipeline` — deployment preview status
- `lib/production-readiness` — health checks
- `lib/persistence` — Supabase adapter reference

## Documents

| Document | Description |
|----------|-------------|
| [cloud-architecture.md](./cloud-architecture.md) | Architecture overview |
| [deployment-flow.md](./deployment-flow.md) | Deployment pipeline flow |
| [environments.md](./environments.md) | Environment separation strategy |
| [secrets.md](./secrets.md) | Secrets management (stub) |
| [github-branch-strategy.md](./github-branch-strategy.md) | Git branch model |

## Dashboard

- **Primary:** `/cloud` — Cloud Foundation Dashboard (FHIS Spanish)
- **Lab:** `/lab/cloud-foundation` — Engineering harness

## Constraints

- No production deploy — preparation only
- No modification of Runtime, Executive Mesh, AI Runtime, or Skills internals
- Production blocked by default (`CLOUD_PRODUCTION_BLOCKED=true`)
