# Architecture

## Components

```
lib/preview-deployment/
├── types.ts                  # Contract + statuses
├── deployment-request.ts     # Request factory
├── config.ts                 # Feature flags
├── deployment-validator.ts   # Preconditions
├── deployment-planner.ts     # Step plans
├── deployment-runner.ts      # Execute / rollback
├── deployment-health.ts      # Health + smoke tests
├── deployment-audit.ts       # Audit trail
├── deployment-store.ts       # Persistence
├── deployment-orchestrator.ts # Main API
└── index.ts

lib/preview-runtime/          # 5370 dependency
lib/cloud-foundation/preview-adapters.ts  # GitHub/Vercel/Supabase stubs
```

## Status Lifecycle

`DRAFT` → `VALIDATING` → `BLOCKED` | `AWAITING_APPROVAL` → `APPROVED`
→ `CREATING_REPOSITORY` → `PUSHING_CODE` → `CONFIGURING_ENVIRONMENT`
→ `DEPLOYING` → `VERIFYING` → `READY` | `READY_WITH_PLAN` | `FAILED`
→ `ROLLED_BACK` | `CANCELLED`

## Dry-Run vs Real

| Condition | Result |
|-----------|--------|
| Flags off | `READY_WITH_PLAN`, no URL |
| Flags on + creds | Real provider actions, verified URL |
| Flags on, no creds | Plan only per provider |
