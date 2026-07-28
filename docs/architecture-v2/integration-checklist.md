# Integration Checklist — Architecture V2

**Role:** Single **integration agent** for Programs **6000–6080**.  
**Authority:** Final merge, conflict-zone edits, `package.json` / `tsconfig*` / root test wiring / `architecture:check`.  
**Governance:** [parallel-execution-governance.md](./parallel-execution-governance.md)

---

## Pre-flight

- [ ] Confirm each package agent registered files in [agent-change-log.md](./agent-change-log.md)
- [ ] Confirm no overlapping paths vs [file-ownership-matrix.md](./file-ownership-matrix.md)
- [ ] Run canonical redefinition heuristic:

```bash
node scripts/check-canonical-redefinition.js
```

- [ ] If the script fails → **STOP**. Do not merge. Assign fix to contracts or offending package.

---

## Merge order (strict)

Merge **one program at a time**, in this order:

| Step | Program | Package |
|------|---------|---------|
| 1 | **6000** | contracts freeze / audit docs |
| 2 | **6010** | contracts (domain) |
| 3 | **6020** | application |
| 4 | **6030** | orchestration |
| 5 | **6040** | events |
| 6 | **6050** | delivery |
| 7 | **6060** | experience |
| 8 | **6070** | migration |
| 9 | **6080** | certification |
| 10 | Wave close | integration wiring (`package.json`, tsconfig, architecture:check) |

---

## After each merge

1. Resolve conflicts **additively** — **never** discard foreign changes to unblock.
2. Run available tests for the merged surface (package tests and/or project lint/typecheck as configured).
3. Record merge result in [agent-change-log.md](./agent-change-log.md) under Integration.
4. Only then proceed to the next program.

---

## Sequential environment commands (never parallel)

After the merge wave (or before certification / release verification), run **exactly one sequence**, single terminal:

```bash
npm run kill:ports
npm run clean
npm run build
npm run reset:dev
```

Rules:

- Do **not** run `build`, `clean`, `reset:dev`, or `dev` in parallel across agents.
- Do **not** start `dev` while `build` or `clean` is running.
- PATH: prepend `C:\Users\RafaelGalbarroBarba\AppData\Local\forgeos-node` if needed.

---

## Conflict zones (integration owns by default)

Serialize edits to:

- `package.json`
- `tsconfig.json` / `tsconfig.*.json`
- `lib/navigation/sidebar-items.ts`
- `components/mission-control/MissionControlShell.tsx`
- `app/layout.tsx`

---

## architecture:check wiring note

As of governance establishment:

- `architecture:check` is **not** present in `package.json`.
- `package.json` is a conflict zone reserved for the integration agent.
- Until wired, operators must run:

```bash
node scripts/check-canonical-redefinition.js
```

When adding `architecture:check`, the integration agent should invoke this script (and any other architecture gates) from that npm script **without** racing other agents’ package.json edits.

---

## Forbidden integration behaviors

- Mass `--ours` / `--theirs` to delete another package’s work
- Destructive git ops against other agents’ branches
- Parallel builds on the shared workspace
- Declaring the wave complete without tests after each merge
- Skipping the canonical-redefinition check when domain or entity-shaped types changed
