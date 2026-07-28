# Parallel Execution Governance — Architecture V2

**Status:** ESTABLISHED  
**Scope:** Programs **6000–6080** (Architecture V2 wave)  
**Authority:** Integration agent (final merge) + Contracts agent (canonical types)

This document is the **binding rule set** for parallel agents working on ForgeOS Architecture V2. It extends (does not replace) engineering governance under `docs/engineering/`.

---

## Non-negotiable user rules

Before any agent modifies code or contracts:

| # | Rule | Enforcement |
|---|------|-------------|
| 1 | **Split work into packages with exclusive ownership** | See [file-ownership-matrix.md](./file-ownership-matrix.md) |
| 2 | **No agent may modify the same file simultaneously** | One owner per path; conflict zones serialize |
| 3 | **One agent owns contracts** | Contracts package only (`src/core/domain/**`, domain/ADR docs, freeze-rules) |
| 4 | **Other agents implement only against approved contracts** | Import from `src/core/domain`; do not redefine Mission, Venture, etc. |
| 5 | **One agent performs final integration** | Integration agent only — see [integration-checklist.md](./integration-checklist.md) |
| 6 | **Run tests after each merge** | Integration agent runs tests after every program merge |
| 7 | **Do not resolve conflicts by discarding others' changes** | Merge additively; never `--ours`/`--theirs` mass discard |
| 8 | **Register files modified by each agent** | Append to [agent-change-log.md](./agent-change-log.md) |
| 9 | **Stop if canonical entity redefinition is detected** | Run `scripts/check-canonical-redefinition.js`; halt on fail |
| 10 | **Build, clean, and dev must run sequentially** | Never parallel `kill:ports` / `clean` / `build` / `reset:dev` / `dev` |

---

## Package ownership (exclusive)

| Package | Exclusive paths (no overlap) | Typical program |
|---------|------------------------------|-----------------|
| **contracts** | `src/core/domain/**`, `docs/architecture-v2/domain/**`, `docs/architecture-v2/adr/**`, `docs/architecture-v2/freeze-rules.md` | 6010 (+ 6000 freeze) |
| **application** | `src/core/application/**` | 6020 |
| **orchestration** | `src/core/orchestration/**` | 6030 |
| **events** | `src/core/events/**` | 6040 |
| **delivery** | `src/core/delivery/**`, `docs/architecture-v2/delivery-model/**` | 6050 |
| **experience** | `src/presentation/**`, `app/company/**`, `app/activity/**`, `app/settings/**`, `lib/navigation/**` (non-conflict nav), careful Mission Control nav | 6060 |
| **migration** | `src/core/migration/**`, `src/legacy/migration/**`, `app/admin/migration-v2/**` | 6070 |
| **certification** | `docs/architecture-v2/certification/**`, `scripts/certify*`, `scripts/run-v2-certification*` | 6080 |
| **integration** | `package.json` scripts, `tsconfig*`, root tests wiring, `architecture:check` | Final integrator |
| **docs shared** | `docs/architecture-v2/README.md` | Integration merges links |

Full matrix + conflict zones: [file-ownership-matrix.md](./file-ownership-matrix.md).

---

## Workflow

```
1. Contracts agent lands / freezes approved domain contracts
2. Parallel package agents implement ONLY inside their exclusive paths
   - against approved contracts (imports only)
   - append modified files to agent-change-log.md
3. Stop immediately if check-canonical-redefinition fails
4. Integration agent merges in order 6000 → 6080
5. After EACH merge: run tests
6. After wave (or before certification): sequential
      kill:ports → clean → build → reset:dev
7. Certification agent runs evidence suite (no new features)
```

### Parallel phase (allowed)

- Agents work on **disjoint ownership packages** concurrently.
- Contracts must be **approved / frozen** before dependents treat types as stable.
- Docs under a package’s exclusive `docs/architecture-v2/<area>/` may land with that package.

### Serialized phase (required)

- Any edit to a **CONFLICT ZONE** (see matrix).
- All **integration** files (`package.json`, `tsconfig*`, root test wiring).
- Final merge queue and build/clean/dev commands.
- Mission Control shell / sidebar primary nav changes.

---

## Contracts discipline

1. **Single source of truth** for canonical entities: `src/core/domain/**`.
2. Application, orchestration, events, delivery, experience, and migration agents:
   - **MAY** import and use domain types.
   - **MUST NOT** declare a second `type Mission`, `interface Venture`, etc. that competes with domain.
3. Legacy `lib/**` types remain until migration; adapters map — they do not become a second canonical model.
4. Detected redefinition → **STOP EXECUTION**, report path, assign fix to contracts or offending package owner.

Heuristic gate:

```bash
node scripts/check-canonical-redefinition.js
```

(`architecture:check` is not yet wired in `package.json` — reserved for integration agent. Until then, run this script manually before merge.)

---

## Change registration

Every agent **must** append to [agent-change-log.md](./agent-change-log.md):

- Program ID and package name
- Agent / branch identity
- Complete list of files created or modified
- Notes on any conflict-zone touch (must be empty unless pre-approved by integration)

---

## Conflict resolution

| Situation | Required behavior |
|-----------|-------------------|
| Two agents need same file | Reassign ownership or serialize; do not dual-edit |
| Git merge conflict | Integrate both intents; never discard foreign hunks to “make green” |
| Canonical redefinition | Fail the wave; revert or relocate type into `src/core/domain` |
| Accidental `package.json` edit by non-integration agent | Revert; open note for integration agent |

---

## Build / clean / dev sequential kill chain

Only **one** operator (integration agent / Architecture Owner) runs:

```text
npm run kill:ports
npm run clean
npm run build
npm run reset:dev
```

Never run these in parallel across agents or terminals on the same workspace.

PATH note: prepend `C:\Users\RafaelGalbarroBarba\AppData\Local\forgeos-node` when invoking Node/npm for ForgeOS scripts.

---

## Related documents

- [file-ownership-matrix.md](./file-ownership-matrix.md)
- [agent-change-log.md](./agent-change-log.md)
- [integration-checklist.md](./integration-checklist.md)
- [freeze-rules.md](./freeze-rules.md)
- [README.md](./README.md)
- Engineering: [../engineering/multi-agent-workflow.md](../engineering/multi-agent-workflow.md), [../engineering/build-policy.md](../engineering/build-policy.md)

---

## Declaration

**PARALLEL EXECUTION GOVERNANCE ESTABLISHED** for Programs 6000–6080 when this file and the ownership matrix, change log, integration checklist, freeze pointer, and canonical-redefinition checker are present in-repo.
