# GitHub Branch Strategy — Program 4300

## Branch Model

| Branch | Type | Protected | Deploy target | Description |
|--------|------|-----------|---------------|-------------|
| `main` | main | Yes | production | Production releases only |
| `develop` | develop | Yes | staging | Continuous integration |
| `release/*` | release | Yes | staging | Release candidates |
| `feature/*` | feature | No | preview | Feature development |
| `hotfix/*` | hotfix | Yes | production | Critical fixes |

## Workflow

1. Create `feature/my-feature` from `develop`
2. Open PR to `develop` — triggers preview deploy
3. Merge to `develop` — staging integration
4. Create `release/1.0.0` from `develop`
5. Test on staging, then merge to `main`
6. Tag release on `main`

## Protection Rules

- PR required for all merges to protected branches
- Status checks: `build`, `lint`, `typecheck`, `production-readiness`
- No direct pushes to `main` or `develop`

## Hotfix Flow

1. Branch `hotfix/critical-fix` from `main`
2. Fix, test, PR to `main`
3. Cherry-pick or merge back to `develop`

## Implementation

Defined in `lib/cloud-foundation/github-strategy.ts`. Used by Cloud Dashboard and deployment status aggregator.

## Vercel Integration

Branch → environment mapping is handled by `lib/cloud-foundation/vercel-config.ts` and `vercel.json` git deployment rules.
