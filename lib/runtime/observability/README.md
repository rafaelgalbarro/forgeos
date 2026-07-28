# Runtime Observability (Epic 4.6)

ForgeOS Runtime observability, monitoring, recovery planning, and diagnostics.

**Location:** `lib/runtime/observability/`  
**Lab:** `/lab/runtime-observability`

## Scope

- Health probes for all runtime components
- In-memory traces, metrics, alerts, errors, history
- Recovery plan generation (plan only — **no auto-execute**)
- Diagnostics (report only — **no auto-fix**)
- No Dashboard / Mission Control wiring

## Monitored components

| Component | Probe |
|-----------|-------|
| Event Bus | History depth, last event age |
| Scheduler | Task counts, blocked/failed |
| Task Queue | Depth, dead letter, saturation |
| Worker Runtime | Registry, health levels |
| Execution Engine | Live when `executionEngine` wired (Epic 4.5; monitor does this automatically) |
| Memory | Executive memory records |
| Decision Graph | Node count, orphan deps |
| AI Gateway | Configured providers (read-only) |
| AI Orchestration | Task registry, observations (read-only) |

## Execution Engine integration

Epic 4.5 (`lib/runtime/execution-engine/`) is integrated in `createRuntimeMonitor`. Standalone contexts without `executionEngine` get `OFFLINE`/`WARNING` probes via `EXECUTION_ENGINE_DEPENDENCY_NOTE`.

## Trace pipeline

```
Event → Scheduler → Queue → Worker → Execution → Memory → Finished
```

## Recovery actions (plan only)

- `RESTART_WORKER`
- `RETRY_TASK`
- `CLEAR_BLOCKED_QUEUE`
- `CLEAN_ORPHAN_SESSION`
- `RE_EMIT_EVENT`

## Usage

```typescript
import { createRuntimeMonitor } from "@/lib/runtime/observability/runtime-monitor";

const monitor = createRuntimeMonitor("venture_123");
const dashboard = monitor.seedDemoPipeline();
// dashboard.overallHealth, dashboard.alerts, dashboard.recoveryPlan, ...
```

Direct imports preferred over barrel `index.ts` in hot paths.
