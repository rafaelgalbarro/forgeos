# Architecture — Preview Runtime

## Layers

```
Creation Output Studio (5350)
        ↓
CodeProject loader (5360)
        ↓
Sandbox Manager (5370)
        ↓
┌─────────────────────────────────────┐
│  Isolation Layer                    │
│  Docker (preferred) | child_process │
└─────────────────────────────────────┘
        ↓
Temp workspace → install → build → start → health check
        ↓
Preview iframe (localhost) + Log viewer
```

## Modules

| Module | Role |
|--------|------|
| `sandbox-manager.ts` | Lifecycle orchestration |
| `sandbox-runner.ts` | spawn, workspace, files |
| `sandbox-store.ts` | In-memory state + logs |
| `sandbox-health.ts` | HTTP health checks |
| `sandbox-lifecycle.ts` | State machine |
| `security/*` | Allowlist, paths, network, limits |
| `error-parser.ts` | Classify build/runtime errors |
| `repair-plan.ts` | Change request integration |

## Adapters (read-only)

- Creation Output (`lib/creation-output/`)
- Code Generation (`lib/code-generation/`)
- Change Requests for repair plans

## Server-side execution

All heavy work runs in API routes / server actions — never in the ForgeOS client bundle.
