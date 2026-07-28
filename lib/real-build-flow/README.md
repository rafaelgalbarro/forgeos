# ForgeOS Real Build Flow (RC5.2)

First controlled flow to transform a **Venture** into a **preview-deployable project** using Build Platform inputs + Real Connections + Real Execution Approval Layer.

## Default mode

`ENABLE_REAL_BUILD_FLOW=false` → **dry-run only** (no real GitHub/Supabase/Vercel mutations).

## Pipeline (16 steps)

1. Select Venture
2. Read Build Context
3. Read Build DNA
4. Read Release Package
5. Generate Execution Plan
6. Full dry-run (GitHub, Supabase, Vercel)
7. Risk check
8. Human approval (RC5.1)
9–13. Provider steps (only if `ENABLE_REAL_BUILD_FLOW=true` + approved)
14. Audit log
15. Rollback plan
16. Final result

## Security

- Preview/sandbox only — no production deploy
- No Cloudflare DNS apply in RC5.2
- No destructive operations
- Credentials server-side only
- Rollback plan required before execution

## Entry points

- `runBuildFlowDryRun()` — steps 1–8
- `requestBuildFlowApproval()` — dry-run + approval session
- `executeBuildFlow()` — full flow with gates

## Lab

`/lab/real-build-flow`
