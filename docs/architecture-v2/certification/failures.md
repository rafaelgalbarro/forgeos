# Failure Scenarios — PROGRAM 6080

Automated where possible; otherwise scripted dry-run / structural with **NOT AUTOMATED** tags.

| Scenario | Status | Automation | Evidence | Notes |
|----------|--------|------------|----------|-------|
| Provider unavailable | PARTIAL | NOT AUTOMATED | `lib/connections`, `docs/real-connections/dry-run.md` | Dry-run paths exist; no provider-down harness executed |
| AI disabled | PARTIAL | SCRIPTABLE | `mission-execution-plan.ts` | Defaults DRY_RUN + ESTIMATED fixtures |
| Build failure | PASS | OBSERVED | `build-procedure-evidence.json` | Product `npm run build` failed during certification |
| Approval rejected | PARTIAL | NOT AUTOMATED | approval-gates (orchestration + autonomous-build), preview-deployment | Types exist; reject path not live E2E |
| Sandbox timeout | PARTIAL | NOT AUTOMATED | sandbox-runner / sandbox-manager | Not exercised |
| Deployment failure | PARTIAL | NOT AUTOMATED | deployment-runner + config | No invented remote failure URLs |
| Persistence retry | PARTIAL | NOT AUTOMATED | persistence-audit, mission-repository | localStorage/in-memory dominant |
| Event duplication | PARTIAL | NOT AUTOMATED | events envelope/catalog | Dedup not E2E proven |
| Stale version | PARTIAL | NOT AUTOMATED | delivery types, output-versioning | Immutability rules present; conflict test not run |
| User pause/resume | PARTIAL | NOT AUTOMATED | mission-pause.ts, PauseMission/ResumeMission commands | UX loop not smoke-tested |

## Observed critical failure (detail)

Next.js compiled successfully then failed type validation:

```
./src/core/application/handlers/command/index.ts
Type error: Module "../../ports" has no exported member 'ApplicationPorts'.
```

Additional `tsc` errors include missing/incorrect domain exports (`DeploymentTarget`) and wrong relative imports under `handlers/shared/pipeline.ts` (paths pointing at `../commands/types` instead of application root).

## Closure criteria for failure certification

Each scenario needs either: automated test with exit 0 + artifact, or signed dry-run script with expected observable outcome — not documentation alone.
