# Recovery

Isolated failures **must not** restart the whole mission.

## Actions

| Action | Effect |
|--------|--------|
| `retry` | Reset failed node to `ready` |
| `retry_with_change` | Retry with optional input changes |
| `skip_optional` | Skip optional node |
| `pause` / `resume` | Mission-level pause control |
| `cancel` | Cancel pending/running nodes |
| `logical_rollback` | Reset target + dependents only |
| `repair_plan` | Bump plan version |
| `human_intervention` | Pause with rationale |

Implemented in `recovery/recovery-actions.ts`.
