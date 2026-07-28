# MissionExecutionPlan

Canonical plan coordinated by the Orchestration Kernel.

## Shape

```ts
MissionExecutionPlan {
  planId, missionId, version, objective,
  stages, nodes, dependencies, approvals, policies,
  estimatedCost, estimatedDuration, status
}
```

## Node types

`UNDERSTAND` · `RESEARCH` · `DECIDE` · `PLAN` · `GENERATE_ARTIFACT` · `GENERATE_OUTPUT` · `GENERATE_CODEBASE` · `BUILD` · `VALIDATE` · `CREATE_PREVIEW` · `APPROVE` · `CREATE_RELEASE` · `DEPLOY` · `OPERATE` · `EVOLVE`

## Canonical first flow

Create Mission → Understand Intent → Select Outputs → Approve Plan → Generate Venture → Brand → Website → Web App → Codebase → Build → Preview → Release Preview → Deployment Preview

Built by `buildCanonicalMissionPlan()` in `planning/mission-execution-plan.ts`.

## Estimates

`estimatedCost` / `estimatedDuration` always carry `kind: "estimated"` plus assumptions. Snapshots include an explicit disclaimer so Mission Control never treats them as actual spend.
