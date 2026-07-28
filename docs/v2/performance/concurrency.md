# Concurrency Control

Configurable via environment variables or `readConcurrencyLimits()`.

| Limit | Default |
|-------|---------|
| MAX_GLOBAL_EXECUTIONS | 20 |
| MAX_WORKSPACE_EXECUTIONS | 10 |
| MAX_VENTURE_EXECUTIONS | 5 |
| MAX_AI_EXECUTIONS | 3 |
| MAX_CODE_BUILDS | 3 |
| MAX_PREVIEW_SANDBOXES | 3 |
| MAX_DEPLOYMENT_EXECUTIONS | 2 |

## Resource Locks

Types: venture, project, release, sandbox, deployment.

- `acquireLock()` / `releaseLock()` / `isLocked()`

Implementation: `src/core/performance/concurrency/`
