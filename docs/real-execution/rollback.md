# Rollback Validator

## Purpose

Ensure a rollback plan exists and is actionable before real execution.

## Validation checks

1. Dry-run plan must exist with `rollbackSteps`
2. At least one rollback step must be reversible or descriptive
3. Governance rollback plan from `skills-governance/rollback-engine` provides compensation actions

## Gate

`rollback_exists` in execution-guard:

- **Dry-run mode**: validation deferred (informational)
- **Sandbox/real mode**: must pass before execution

## Rollback sources

1. **Connection plan** — `plan.rollbackSteps` from adapter `buildPlan()`
2. **Governance plan** — `buildRollbackPlan(skillId, action)` for compensation steps

## Return value

Execution result includes `rollbackPlan` (connection plan with rollback steps) even when execution is blocked.
