# Ports (Program 6020)

Handlers depend on **interfaces only** (`src/core/application/ports`).

| Port | Role |
|------|------|
| `ClockPort` | now / ids |
| `IdentityPort` | require actor |
| `AuthorizationPort` | roles / workspace access |
| `TelemetryPort` | command summaries |
| `NotificationPort` | notify |
| `AiPort` | summaries (no Runtime) |
| `FactoryPort` | plan outputs |
| `ExecutionPort` | thin accept (not Runtime engine) |
| `JobPort` | enqueue |
| `SandboxPort` | preview start/stop |
| `SourceControlPort` | scaffold |
| `DeploymentPort` | deploy/rollback |
| `UnitOfWorkPort` | repositories + events + idempotency + commit/rollback |

Test adapters: `createTestPorts()` / in-memory UnitOfWork in `testing/in-memory.ts`.
Real Supabase is not required for Program 6020 verification.
