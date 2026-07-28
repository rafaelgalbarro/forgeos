# Orchestration

Implemented in `output-coordinator.ts`.

## Stages

| Stage | Mission Phase | Action |
|-------|--------------|--------|
| UNDERSTAND | UNDERSTAND | Capture intent |
| SELECT_OUTPUTS | PLAN | Generate multi-output plan |
| BUILD_SHARED_CONTEXT | BUILD | Create shared entities |
| GENERATE_SHARED_ASSETS | BUILD | Design tokens + API contracts |
| GENERATE_OUTPUTS | BUILD | Batch generation with dependency order |
| VALIDATE | VALIDATE | Output validation |
| PREVIEW | VALIDATE | Preview URLs |
| APPROVE | VALIDATE | Governance gates |
| DEPLOY_PREVIEW | DEPLOY | Dry-run deploy only |
| OPERATE | OPERATE | Operational assets |
| EVOLVE | EVOLVE | Continuous improvement |

## Parallel Execution

Batches built via `buildGenerationBatches()`:
- Website copy + DB schema → parallel OK
- Website UI + Brand (unapproved) → NOT parallel

Uses existing Runtime/Scheduler adapters — no new scheduler.

## Integration

- `mission-runner.ts` PLAN phase → creates multi-output plan
- `mission-runner.ts` BUILD phase → calls `orchestrateMultiOutput()`
