# Capability Planner

Generates an `CapabilityExecutionPlan` with:

- `steps` — ordered skill executions
- `dependencies` — step dependency graph
- `order` — topological execution order
- `rollback` — reverse rollback actions
- `recovery` — failure recovery strategies
- `approvalRequired` — from resolver
- `estimatedDurationMs` / `estimatedCost`

## Multi-step capabilities

| Capability | Steps |
|------------|-------|
| `deploy_software` | 9 skills (CI → deploy → notify → memory) |
| `publish_release` | 5 skills |
| `generate_frontend` | 3 skills |
| `generate_backend` | 3 skills |

Single-skill capabilities produce a one-step plan using the resolver's primary skill.
