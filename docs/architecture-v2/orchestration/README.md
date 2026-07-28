# Orchestration Kernel V2 (PROGRAM 6030)

The Orchestration Kernel is the **nucleus that coordinates a full mission from intent to deploy/operate**.

It does **not** replace Runtime, Scheduler, Executive Mesh, or Factories. It coordinates them through **ports** and **canonical contracts**.

## Location

`src/core/orchestration/`

| Area | Role |
|------|------|
| `kernel/` | Mission lifecycle, tick loop, command wiring |
| `planning/` | `MissionExecutionPlan` builder |
| `workflow/` | Validated DAG |
| `dependencies/` | Dependency satisfaction |
| `execution/` | Modes + node executor (in-memory dry-run) |
| `coordination/` | Parallelism, multi-output selection, progress |
| `recovery/` | Isolated failure recovery |
| `snapshots/` | Mission Control read models |
| `policies/` | Approvals, cost/time estimates |
| `ports/` | Event Bus / Scheduler / Runtime / Capability adapters |

## Hard rules

- No second Event Bus, Worker Runtime, or Scheduler
- No engine execution from React
- No venture hardcoding (NEXORA only as optional fixture validation)
- Zero React/Next imports under `src/core/orchestration/`
- Production is **never** auto-activated

## Depends on

- `src/core/domain/` (6010 — stub-aligned)
- `src/core/application/` (6020 — stub-aligned)
- Existing `lib/runtime/*`, factories, `lib/multi-output/*` via adapters

## Quick start

```ts
import { createOrchestrationKernel } from "@/src/core/orchestration";

const kernel = createOrchestrationKernel();
kernel.createMission({
  missionId: "demo",
  objective: "Preview SaaS package",
  executionMode: "DRY_RUN",
});
await kernel.start("demo");
const snap = kernel.snapshot("demo"); // Mission Control consumes this
```

## Verification

```bash
npx --yes tsx src/core/orchestration/orchestration-kernel.test.ts
npx --yes tsx scripts/validate-orchestration-kernel.ts
```

## Docs in this folder

- [mission-plan.md](./mission-plan.md)
- [workflow-dag.md](./workflow-dag.md)
- [capability-resolution.md](./capability-resolution.md)
- [approvals.md](./approvals.md)
- [parallelism.md](./parallelism.md)
- [recovery.md](./recovery.md)
- [snapshots.md](./snapshots.md)
- [execution-modes.md](./execution-modes.md)
