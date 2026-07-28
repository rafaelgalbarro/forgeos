# Architecture — Real Build Flow

```
Venture
  → Build Context (RC Build Platform)
  → Build DNA
  → Release Package
  → Execution Plan (lib/real-build-flow/execution-plan.ts)
  → Dry-run (lib/connections/)
  → Risk (lib/skills-governance/)
  → Approval (lib/real-execution/)
  → GitHub / Supabase / Vercel steps
  → Audit + Rollback
```

## Modules

| Module | Role |
|--------|------|
| `build-flow.ts` | Orchestrator |
| `execution-plan.ts` | 16-step plan |
| `github-step.ts` | Repo, branch, scaffold |
| `supabase-step.ts` | Sandbox DB plan |
| `vercel-step.ts` | Preview deployment plan |
| `validator.ts` | Env gates + blocked ops |
| `audit.ts` | Flow audit log |
| `rollback-plan.ts` | Rollback validation |

No direct provider calls from UI — API routes server-side only.
