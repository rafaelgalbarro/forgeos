# Remaining Gaps — PROGRAM 6080

Gaps that prevent **FORGEOS V2 — END-TO-END CERTIFIED**. Prefer this list over optimism.

## Critical / High

| Gap | Severity | Owner | Repair | Closure criteria |
|-----|----------|-------|--------|------------------|
| `npm run build` / `tsc` fail (`ApplicationPorts`, import paths, `DeploymentTarget`) | CRITICAL | application + integration | Unify ports export; fix handler relative imports; export missing domain types | `npx tsc --noEmit` exit 0; `npm run build` exit 0 |
| Missing `architecture:check`, `typecheck`, `test` scripts | HIGH | integration | Wire scripts + harness for package `__tests__` | Scripts present; exit 0 on clean tree |
| Live smoke NOT_RUN (port 3000 busy + build fail) | HIGH | platform + certification | Free ports; sequential `reset:dev`; record HTTP codes | Evidence JSON lists 200s for UX checklist |
| Live lineage for Aurora Ops fixture | HIGH | delivery + mission-control | Persist VersionLineage through Intent→Deployment for `mission-cert-6080-aurora-ops` | Lineage path artifact→deployment without DEMO-only critical links |
| V2 flags all OFF / SoT still legacy | HIGH | migration + product | Gradual dual-read then cutover after green build | Documented flag rollout with rollback drill |
| Domain 6010 thin stubs | HIGH | contracts | Complete aggregates; keep additive | Domain README no longer “thin stubs”; mappers tested |

## Medium

| Gap | Severity | Owner | Notes |
|-----|----------|-------|-------|
| HEURISTIC intention / decision seeding | MEDIUM | mission-control | Documented in 5150 e2e-gaps; not false PASS |
| Impact analysis scenario map (not live AST) | MEDIUM | multi-output / delivery | ESTIMATED / HEURISTIC |
| Preview deployment real path disabled by default | MEDIUM | preview-deployment | Correct for safety; not product completeness |
| Failure scenarios mostly NOT AUTOMATED | MEDIUM | certification + runtime | Need harnesses |
| Performance metrics unavailable | MEDIUM | certification | Measure after green build |
| Delivery E2E via tsx not run by default | MEDIUM | delivery + certification | Use `--with-tsx` after deps available |
| Zombie / port cleanup incomplete | MEDIUM | platform | kill:ports exit 0 but 3000 remained in use |

## Explicit non-goals of this certification

- No new product features  
- No hiding of stubs / dry-runs  
- No invented remote deployment URLs or live provider claims  

## Related prior gaps

`docs/mission-control/e2e-gaps.md` (PROGRAM 5150) remains relevant for Mission Control heuristic/demo limitations.
