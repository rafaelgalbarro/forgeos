# File Ownership Matrix — Programs 6000–6080

**Rule:** Paths below are **exclusive**. No two packages may claim the same path.  
**Companion:** [parallel-execution-governance.md](./parallel-execution-governance.md)

---

## Program → package map

| Program | Name | Owning package |
|---------|------|----------------|
| **6000** | Architecture Audit & Freeze | **contracts** (freeze/audit docs) + **integration** (shared README links only) |
| **6010** | Canonical Domain Model | **contracts** |
| **6020** | Application Command/Query Layer | **application** |
| **6030** | Orchestration Kernel V2 | **orchestration** |
| **6040** | Unified Event and State Model | **events** |
| **6050** | Artifact / Output / Codebase Unification | **delivery** |
| **6060** | Experience Layer Consolidation | **experience** |
| **6070** | Legacy Migration and Compatibility | **migration** |
| **6080** | V2 End-to-End Certification | **certification** |
| *(wave close)* | Final wiring | **integration** |

---

## Exclusive ownership packages

### contracts

| Path | Notes |
|------|--------|
| `src/core/domain/**` | Sole home for canonical entities |
| `docs/architecture-v2/domain/**` | Domain docs |
| `docs/architecture-v2/adr/**` | Architecture decision records |
| `docs/architecture-v2/freeze-rules.md` | Contract freeze rules |

**Does not own:** application handlers, UI, orchestration runtime logic, events package (beyond domain event *types* living under domain if approved).

### application

| Path | Notes |
|------|--------|
| `src/core/application/**` | Commands, queries, ports, use cases |

### orchestration

| Path | Notes |
|------|--------|
| `src/core/orchestration/**` | Kernel, planning, workflow graph, DAG validators |

### events

| Path | Notes |
|------|--------|
| `src/core/events/**` | Event envelope adapters, unified state model modules |

### delivery

| Path | Notes |
|------|--------|
| `src/core/delivery/**` | Delivery-model code (Artifact → Deployment lineage) |
| `docs/architecture-v2/delivery-model/**` | Delivery-model documentation |

If `src/core/delivery/` does not exist yet, the delivery agent creates it **inside this exclusive tree only**.

### experience

| Path | Notes |
|------|--------|
| `src/presentation/**` | V2 presentation layer |
| `app/company/**` | Company experience routes |
| `app/activity/**` | Activity routes |
| `app/settings/**` | Settings routes (V2 experience scope) |
| `lib/navigation/**` | Nav helpers — **except** conflict-zone sidebar registry (serialize) |
| Mission Control nav changes | Prefer package-local components; **serialize** shell/sidebar conflict zones |

### migration

| Path | Notes |
|------|--------|
| `src/core/migration/**` | V2 migration registry / adapters |
| `src/legacy/migration/**` | Legacy-facing migration helpers |
| `app/admin/migration-v2/**` | Admin migration UI |

### certification

| Path | Notes |
|------|--------|
| `docs/architecture-v2/certification/**` | Evidence reports, scorecards |
| `scripts/certify*` | Certification scripts |
| `scripts/run-v2-certification*` | Runner scripts |

### integration (single agent)

| Path | Notes |
|------|--------|
| `package.json` (scripts / deps wiring) | **Only** integration agent |
| `tsconfig.json`, `tsconfig.*.json` | **Only** integration agent |
| Root tests wiring (e.g. root `*.test.ts` harness, jest/vitest config if added) | **Only** integration agent |
| `architecture:check` script entry | **Only** integration agent creates/wires |

### docs shared

| Path | Notes |
|------|--------|
| `docs/architecture-v2/README.md` | Integration agent **merges links** from package docs |

Governance docs in this folder that are not package-exclusive (`parallel-execution-governance.md`, `file-ownership-matrix.md`, `agent-change-log.md`, `integration-checklist.md`) are maintained by the **integration / governance** lane; package agents append to the change log only.

---

## CONFLICT ZONES (must serialize)

These paths are **never** edited by two agents at once. Default owner: **integration**, unless a wave plan explicitly assigns a single UX/experience agent for one serialized PR.

| Path | Why |
|------|-----|
| `package.json` | Script/deps races; architecture:check wiring |
| `tsconfig.json` / `tsconfig.*.json` | Path aliases and project references |
| `lib/navigation/sidebar-items.ts` | Primary nav registry |
| `components/mission-control/MissionControlShell.tsx` | Shell composition |
| `app/layout.tsx` | Root layout / providers |

**Protocol for conflict zones**

1. Request a serialized slot from the integration agent.
2. Land a single PR touching the zone.
3. Re-run tests after merge.
4. Register the file in [agent-change-log.md](./agent-change-log.md) under integration (or the assigned serialized agent).

---

## Overlap prohibition checklist

- [ ] No path appears in two package tables above.
- [ ] Agents import contracts; they do not copy entity definitions.
- [ ] Experience does not edit `src/core/**` except via public APIs (no ownership).
- [ ] Certification does not change product code — evidence and scripts only.
- [ ] Migration does not redefine domain entities; it maps legacy → domain.

---

## Legacy / out-of-scope paths

`lib/**` engines outside the experience nav paths remain under existing engineering ownership (`docs/engineering/ownership-map.md`) until a migration ticket explicitly transfers a subtree. V2 agents **must not** mass-refactor foreign `lib/**` trees in this wave.
