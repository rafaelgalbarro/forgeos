# PROGRAM 6150 — Checklist

## Acceptance (ALL required for CERTIFIED)

- [ ] Five companies exist
- [ ] Three can advance simultaneously
- [ ] UI remains navigable
- [ ] No data mixing between ventures
- [ ] One failure does not stop the rest
- [ ] Portfolio Command Center shows real state (`/portfolio/[portfolioId]`)
- [ ] Company Command Center shows results (`/company/[ventureId]`)
- [ ] Value Engine distinguishes evidence vs estimates
- [ ] AI Venture CEO explains recommendations (ADVISORY)
- [ ] Resources are released
- [ ] Build exit 0
- [ ] No remaining P0/P1

## Mandatory tests

| Test | Pass criteria |
|------|---------------|
| performance | 6100 budgets/limits loaded; concurrent submit measured |
| 5 ventures | Exactly five ventures in portfolio |
| concurrency | Three simultaneous accepts/queues |
| fairness | Priority ordering applied |
| isolation | Cross-venture access blocked |
| cache isolation | Request caches do not leak across ventures |
| resource allocation | Allocations registered then released |
| value calculation | Snapshots produced without fake ACTUAL revenue |
| evidence provenance | Every evidence has source + provenance |
| approvals | Recommendations expose requiresApproval |
| pause/resume | One venture paused |
| failure isolation | Controlled failure scoped to one venture |
| preview lifecycle | PLAN_ONLY / no fake READY |
| release | ≥1 release candidate |
| navigation | Company (+ Portfolio when present) routes |
| responsive | CC baseline / Portfolio blocked if missing |
| accessibility | CC baseline / Portfolio blocked if missing |
| no orphan processes | Executor active count 0 after cleanup |
| no occupied ports | Cert does not bind preview ports |

## Declarations (only with evidence)

```
PROGRAM 6150 — MULTI-COMPANY OPERATIONAL CERTIFICATION VERIFIED.
FORGEOS — MULTI-COMPANY CREATION, OPERATION AND VALUE MANAGEMENT DEMONSTRATED.
```
