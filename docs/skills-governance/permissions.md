# Permissions

Actor-based permission checks for skill execution.

## Actor Types

- `founder` — Full override
- `ceo` — Execute and approve
- `department` — Scoped by department (cto, cfo, legal, etc.)
- `worker` — Restricted read-only scopes
- `organization` — Org-wide rules

## Effects

| Effect | Behavior |
|--------|----------|
| `allow` | Full access |
| `deny` | Explicit block |
| `restrict` | Limited scopes |
| `expire` | Time-limited |
| `delegate` | Delegated access |

## Default Rules

Founder has `*` scope. Departments have category-scoped access (e.g. cto → development, cicd, cloud:read). Workers are restricted to read operations.

## API

- `checkGovernancePermission(params)` — Generic check
- `checkDepartmentPermission(department, ...)` — Department shortcut
- `listDefaultPermissions()` — All default rules
