# Architecture V2

ForgeOS Architecture V2 documentation hub (Programs **6000–6080**).

## PROGRAM 6000 — Architecture Audit & Freeze

Evidence-based audit + contract freeze. **Does not** implement Kernel V2 or migrate productive SoT.

| Document | Purpose |
|----------|---------|
| [current-system-inventory.md](./current-system-inventory.md) | System inventory (location, I/O, deps, risk) |
| [domain-duplication-map.md](./domain-duplication-map.md) | Mission…Workspace duplication map |
| [state-machine-audit.md](./state-machine-audit.md) | Status enums, synonyms, ungoverned transitions |
| [event-audit.md](./event-audit.md) | Event buses, mission/runtime/telemetry |
| [dependency-map.md](./dependency-map.md) | Layer map + violations |
| [persistence-audit.md](./persistence-audit.md) | localStorage, adapters, SoTs |
| [experience-map.md](./experience-map.md) | Route classification |
| [freeze-rules.md](./freeze-rules.md) | Binding freeze rules |
| [migration-matrix.md](./migration-matrix.md) | Mantener / Adaptar / Migrar / Deprecar |
| [adr/](./adr/) | ADR-001 … ADR-008 |

### ADRs

| ADR | Title |
|-----|-------|
| [ADR-001](./adr/ADR-001-canonical-domain.md) | Canonical Domain |
| [ADR-002](./adr/ADR-002-command-query-separation.md) | Command Query Separation |
| [ADR-003](./adr/ADR-003-orchestration-kernel.md) | Orchestration Kernel |
| [ADR-004](./adr/ADR-004-event-model.md) | Event Model |
| [ADR-005](./adr/ADR-005-repository-boundaries.md) | Repository Boundaries |
| [ADR-006](./adr/ADR-006-legacy-adapters.md) | Legacy Adapters |
| [ADR-007](./adr/ADR-007-experience-layer.md) | Experience Layer |
| [ADR-008](./adr/ADR-008-codebase-build-release-separation.md) | Codebase / Build / Release Separation |

## Parallel execution governance

**PARALLEL EXECUTION GOVERNANCE ESTABLISHED.**

| Document | Purpose |
|----------|---------|
| [parallel-execution-governance.md](./parallel-execution-governance.md) | Full rules + workflow (user rules 1–10) |
| [file-ownership-matrix.md](./file-ownership-matrix.md) | Exclusive package paths + conflict zones |
| [agent-change-log.md](./agent-change-log.md) | Per-program file registration |
| [integration-checklist.md](./integration-checklist.md) | Single integration agent merge protocol |

## Package areas (expected)

| Area | Path |
|------|------|
| Domain / ADRs | [`docs/architecture-v2/domain/`](./domain/README.md), `docs/architecture-v2/adr/**` |
| Application CQ (6020) | [`docs/architecture-v2/application/`](./application/) · `src/core/application/` |
| Orchestration Kernel (6030) | [`docs/architecture-v2/orchestration/`](./orchestration/) · `src/core/orchestration/` |
| Events & state (6040) | [`docs/architecture-v2/events/`](./events/) |
| Delivery model | `docs/architecture-v2/delivery-model/**` |
| Experience layer (6060) | [`docs/architecture-v2/experience/`](./experience/) |
| Migration (6070) | [`docs/architecture-v2/migration/`](./migration/) |
| Certification | `docs/architecture-v2/certification/**` |

## PROGRAM 6060 — Experience Layer

→ **[experience/](./experience/)**

## PROGRAM 6070 — Legacy Migration & Compatibility

Strangler migration V1 → V2. Flags default OFF. Core: `src/core/migration/`. Admin: `/admin/migration-v2`.

| Document | Purpose |
|----------|---------|
| [migration/strategy.md](./migration/strategy.md) | Strangler strategy & status ladder |
| [migration/registry.md](./migration/registry.md) | Seeded component registry (10 flows A–J) |
| [migration/dual-read.md](./migration/dual-read.md) | Dual-read + fallback telemetry |
| [migration/dual-write.md](./migration/dual-write.md) | Temporary dual-write + retirement (2026-10-01) |
| [migration/data-migration.md](./migration/data-migration.md) | Idempotent migrators |
| [migration/feature-flags.md](./migration/feature-flags.md) | `ENABLE_V2_*` matrices |
| [migration/rollback.md](./migration/rollback.md) | Per-component rollback |
| [migration/deprecation.md](./migration/deprecation.md) | Gates before REMOVED |

```bash
npm run architecture:check:6070
npm run test:migration-6070
node scripts/verify-program-6070.js --with-build
```

## PROGRAM 6080 — V2 End-to-End Certification

| Document | Purpose |
|----------|---------|
| [certification/FINAL.md](./certification/FINAL.md) | Formal CERTIFIED / BLOCKED declaration |
| [certification/executive-summary.md](./certification/executive-summary.md) | Verdict overview |
| [certification/certification-results.json](./certification/certification-results.json) | Machine-readable summary |

```bash
node scripts/run-v2-certification.js
```

## PROGRAM 6010 — Canonical Domain Model

Official aggregates, transitions, repository ports, schema migrators, and legacy mappers:

→ **[domain/README.md](./domain/README.md)**

## PROGRAM 6020 — Application Command / Query Layer

Commands + queries + ports + policies. UI reads via queries/snapshots; mutations via commands.

→ **[application/README.md](./application/README.md)**

Checks: `npm run architecture:check:6020` · tests: `npm run test:6020`

## PROGRAM 6030 — Orchestration Kernel V2

Coordinates missions from intent → deploy/preview via ports. Does **not** replace Runtime, Scheduler, Event Bus, or Factories.

→ **[orchestration/README.md](./orchestration/README.md)**

- [mission-plan.md](./orchestration/mission-plan.md)
- [workflow-dag.md](./orchestration/workflow-dag.md)
- [capability-resolution.md](./orchestration/capability-resolution.md)
- [approvals.md](./orchestration/approvals.md)
- [parallelism.md](./orchestration/parallelism.md)
- [recovery.md](./orchestration/recovery.md)
- [snapshots.md](./orchestration/snapshots.md)
- [execution-modes.md](./orchestration/execution-modes.md)

Checks: `npm run test:orchestration` · E2E: `npm run validate:orchestration`

## PROGRAM 6060 — Experience Layer Consolidation

Mission Control as primary V2 entry; Studio, Company OS, Activity, Settings; factories leave primary nav.

- [experience/navigation.md](./experience/navigation.md)
- [experience/mission-control.md](./experience/mission-control.md)
- [experience/mission-page.md](./experience/mission-page.md)
- [experience/studio.md](./experience/studio.md)
- [experience/company-os.md](./experience/company-os.md)
- [experience/legacy-routes.md](./experience/legacy-routes.md)
- [experience/performance.md](./experience/performance.md)

Checks: `npm run architecture:check:6060` · smoke: `npm run test:6060`

## PROGRAM 6070 — Migration & Dual-Run

Strangler V1 → V2. Flags default OFF. Core: `src/core/migration/`. Admin: `/admin/migration-v2`.

- [migration/strategy.md](./migration/strategy.md)
- [migration/registry.md](./migration/registry.md)
- [migration/dual-read.md](./migration/dual-read.md)
- [migration/dual-write.md](./migration/dual-write.md)
- [migration/data-migration.md](./migration/data-migration.md)
- [migration/feature-flags.md](./migration/feature-flags.md)
- [migration/rollback.md](./migration/rollback.md)
- [migration/deprecation.md](./migration/deprecation.md)

```bash
npm run architecture:check:6070
npm run test:migration-6070
npm run verify:6070 -- --with-build
```

## PROGRAM 6040 — Unified Event & State Model

Canonical envelopes, separated catalogs, official state machines, projections, idempotency, and legacy adapters (wrap existing buses — do not replace them).

- [events/README.md](./events/README.md)
- [event-envelope.md](./events/event-envelope.md)
- [catalog.md](./events/catalog.md)
- [state-machines.md](./events/state-machines.md)
- [projections.md](./events/projections.md)
- [idempotency.md](./events/idempotency.md)
- [versioning.md](./events/versioning.md)
- [legacy-events.md](./events/legacy-events.md)

Implementation: `src/core/events/` · checks: `npm run architecture:check:6040` · tests: `npm run test:events`

## Tooling

```bash
npm run architecture:check
# → architecture-check.js (6000/6070) + 6040 + 6050 + 6060
# 6000: exit 0 with warnings for known legacy debt; exit 1 only on CRITICAL (e.g. React in src/core/domain).
# Optional: npm run architecture:check:6000 -- --strict

node scripts/check-canonical-redefinition.js
# Hard STOP if protected canonical names are declared outside src/core/domain
# (will currently fail on pre-existing lib definitions — use during contracts enforcement waves).
```

## Related engineering docs

- [../engineering/multi-agent-workflow.md](../engineering/multi-agent-workflow.md)
- [../engineering/build-policy.md](../engineering/build-policy.md)
- [../engineering/ownership-map.md](../engineering/ownership-map.md)
