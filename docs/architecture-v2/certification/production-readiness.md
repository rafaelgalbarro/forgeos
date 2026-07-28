# Production Readiness — PROGRAM 6080

## Decision

**Not production-ready** for ForgeOS V2 as a complete product.

## Scorecard

| Gate | Result |
|------|--------|
| Clean typecheck | FAIL |
| Clean production build | FAIL |
| Automated test suite | MISSING |
| Architecture check | MISSING |
| Live smoke of core UX | NOT_RUN |
| Preview deploy cannot hit production by default | PASS (safety) |
| Secrets vault / client secret proof | PARTIAL / incomplete |
| Persistence durability (multi-device) | FAIL / localStorage-era |
| V2 migration flags safe defaults | PASS (all OFF) |
| Honest certification declaration | BLOCKED (this program) |

## What may be used today (with caveats)

- Legacy Mission Control / Studio / factories under `lib/*` and `app/*` as **pre-V2 product surfaces**, subject to existing 5150 gaps (HEURISTIC / DEMO / dry-run).  
- V2 packages as **contracts and in-progress infrastructure**, not as certified runtime SoT.

## What must not be claimed

- “V2 end-to-end certified”  
- “Production deploy ready”  
- “Live lineage proven for arbitrary missions”  
- “All failure scenarios automated”

## Minimum bar to revisit production readiness

1. Green sequential: kill:ports → clean → architecture:check → typecheck → test → build → reset:dev  
2. Smoke UX checklist with HTTP evidence  
3. One generic mission (Aurora Ops or successor) through lineage with persisted snapshot  
4. Failure harness coverage for build fail, approval reject, deploy fail, pause/resume  
5. Security client-bundle scan after successful build  
6. Explicit product owner sign-off on remaining DRY_RUN surfaces
