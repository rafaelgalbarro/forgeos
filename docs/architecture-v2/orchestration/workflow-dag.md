# Workflow DAG

Each node includes: `nodeId`, `type`, `capability`, `inputReferences`, `outputContract`, `dependencies`, `executionMode`, `retryPolicy`, `timeout`, `approvalPolicy`, `status`, `assignedDepartment`.

## Validation (`validateWorkflowDag`)

Detects:

| Code | Meaning |
|------|---------|
| `CYCLE` | Dependency cycle |
| `MISSING_DEPENDENCY` | Edge to unknown node |
| `UNAVAILABLE_OUTPUT` | Required output contract missing |
| `IMPOSSIBLE_STAGE` | Stage references missing nodes |
| `EXECUTION_CONFLICT` | Conflicting concurrent deployments |

Ready nodes are those with all dependencies `completed` or `skipped`.
