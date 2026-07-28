# Production Readiness — Program 6500

ForgeOS Production Readiness hardens the platform for 24/7 operation **without modifying** Runtime, Executive Mesh, AI Runtime, or Skills internals.

## Architecture

- **Orchestrator**: `lib/production-readiness/production-health-center.ts`
- **Pattern**: Adapter + dry-run/stub defaults
- **UI**: FHIS Spanish dashboards at `/production`, `/health`, `/monitoring`, etc.
- **Lab**: `/lab/production-readiness`

## Wired vs Stub

| Module | Status |
|--------|--------|
| `system-monitoring` | Wired (Node/process checks) |
| `runtime-monitoring` | Wired via `lib/health` + `lib/runtime/observability` public API |
| `ai-monitoring` | Wired via `lib/ai-control` |
| `provider-monitoring` | Wired via `lib/ai-control/provider-health` |
| `deployment-gates` | Wired via `lib/build-pipeline` policy |
| `feature-flags` | Wired (read-only beta + commercial) |
| `alert-center` / `incident-manager` | localStorage stub |
| `recovery-center` / `backup-manager` / `disaster-recovery` | Stub |
| `performance-dashboard` / `metrics` / `tracing` | Stub (env-gated) |

## Environment

See `.env.example` — `ENABLE_PRODUCTION_MONITORING`, `ENABLE_KILL_SWITCH`, etc.

## Routes

- `/production` — Production Health Center
- `/health` — Health checks + checklist
- `/monitoring` — System + performance
- `/incidents` — Incident CRUD stub
- `/alerts` — Alert registry
- `/recovery` — Recovery procedures
- `/releases` — Release tracking + gates
- `/logs` — Structured log viewer
