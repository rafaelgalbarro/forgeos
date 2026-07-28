# Freeze Rules — Architecture V2

**Program:** 6000 (Architecture Audit & Freeze) and ongoing V2 wave  
**Status:** Active — binding for all agents (6000–6080)  
**Evidence basis:** [current-system-inventory.md](./current-system-inventory.md), audits in this folder

## Parallel execution

All freeze and contract work for Programs **6000–6080** is governed by:

→ **[parallel-execution-governance.md](./parallel-execution-governance.md)**

Exclusive ownership and conflict zones:

→ **[file-ownership-matrix.md](./file-ownership-matrix.md)**

Canonical redefinition heuristic (manual / integration):

```bash
node scripts/check-canonical-redefinition.js
```

Continuous soft/hard architecture checks:

```bash
npm run architecture:check
```

---

## Binding freeze rules (PROGRAM 6000)

1. **No new canonical entity definitions** outside the approved contracts home (`src/core/domain/**` for V2 canon). Do not invent parallel `Mission` / `Venture` / `Workspace` / … aggregates in `lib/` or UI. Legacy `lib/**` definitions remain until migration maps them — do **not** silently redefine them as V2 canon elsewhere.
2. **No new global stores.** Do not add new singleton app-wide stores (especially localStorage key namespaces or module-level SoTs) without contracts + integration approval.
3. **No new schedulers.** Do not introduce additional task/job schedulers; extend or adapt `lib/runtime/scheduler` (or approved V2 orchestration) via adapters.
4. **No new event buses.** Do not create another Event Bus. Adapt/wrap the existing Runtime Event Bus / approved V2 envelope (Program 6040). Telemetry and UI notify channels are not domain buses.
5. **No engines in components.** Presentation must not import `*-engine` modules or runtime engines directly for new work. Use facades/adapters/coordinators.
6. **No UI → persistence writes.** Components/pages must not call `localStorage` / repository internals directly for new features; go through declared repositories/adapters.
7. **New capabilities expose adapters.** Every new capability integrates via an explicit adapter/port — not by reaching into providers, routes, or UI.
8. **Migrations keep compatibility.** Adapters map legacy ↔ V2; do not break existing routes, keys, or consumers without a compatibility path (redirects, dual-read, versioned schemas).
9. **New state belongs to an official state machine.** Attach new statuses only to a documented machine (e.g. `MissionSessionStatus`, runtime queue/worker/execution/venture FSM, preview sandbox). Do not invent ungoverned enums in UI.

---

## Freeze principles (summary)

1. Canonical entities live only under `src/core/domain/**` (V2 target).
2. Do not invent parallel engines or duplicate domain models.
3. Legacy `lib/**` types remain runtime SoT until migration; do not pretend stubs are productive SoT.
4. If `scripts/check-canonical-redefinition.js` fails on **new** violations, **stop** and fix before merge.
5. Integration agent alone wires root scripts / tsconfig / architecture checks (`package.json`).

## What PROGRAM 6000 explicitly does **not** do

- No mass folder moves, route renames, type deletions, repository substitutions
- No productive state migration
- No Kernel V2 implementation in this program
- No UI redesign / feature deletion / parallel engine creation

## Audit artifacts

| Doc | Purpose |
|-----|---------|
| [current-system-inventory.md](./current-system-inventory.md) | System inventory |
| [domain-duplication-map.md](./domain-duplication-map.md) | Entity collisions |
| [state-machine-audit.md](./state-machine-audit.md) | Status machines |
| [event-audit.md](./event-audit.md) | Event systems |
| [dependency-map.md](./dependency-map.md) | Layer violations |
| [persistence-audit.md](./persistence-audit.md) | Storage SoTs |
| [experience-map.md](./experience-map.md) | Routes |
| [migration-matrix.md](./migration-matrix.md) | V2 path |
| [adr/](./adr/) | ADR-001…008 |
