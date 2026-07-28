# Multi-Agent Workflow — Program 4290

End-to-end workflow for parallel ForgeOS delivery.

## Overview

```
Architecture Owner
    → Assign zones & programs
        → Parallel agents (disjoint zones)
            → Merge Queue (serialized)
                → Single Build
                    → Route Verify
                        → RC
                            → Production
```

## Phase 1 — Architecture Owner assigns

1. Read open programs from roadmap / agent queue
2. Map each program to [safe-zones.md](./safe-zones.md)
3. Check [parallel-execution-matrix.md](./parallel-execution-matrix.md) for ❌ pairs
4. Issue assignments with zone lock:

```markdown
Agent A: PROGRAM 6000 | ZONE Cloud | PATHS lib/commercial/, app/billing/
Agent B: PROGRAM 4290 | ZONE Docs   | PATHS docs/engineering/
```

## Phase 2 — Parallel execution

- Each agent follows [agent-playbook.md](./agent-playbook.md)
- Agents push to feature branches — **no direct main pushes**
- Overlapping paths → second agent waits or gets re-zoned

## Phase 3 — Merge queue

Per [merge-policy.md](./merge-policy.md):

1. Docs PRs first
2. Disjoint zone PRs next
3. UX before engines
4. `package.json` last
5. **One merge at a time** through queue (review may be parallel)

## Phase 4 — Single build

Architecture Owner only ([build-policy.md](./build-policy.md)):

```bash
npm run build
```

Exit code must be `0`.

## Phase 5 — Route verify

Minimum HTTP 200 checks:

| Route | Program |
|-------|---------|
| `/` | 4255 First Experience |
| `/command-center` | 4500 Command Center |

Use `dev:fast` if server already running; otherwise `npm run start` after build.

## Phase 6 — RC

- Tag release candidate
- Update program status in docs
- Run program-specific staging gates — [release-governance.md](./release-governance.md)

## Phase 7 — Production

- Release Owner promotes
- Changelog via `lib/launch/changelog.ts` when product-visible
- Release zone locks cleared

## Example wave (completed foundation)

| Agent | Program | Zone | Result |
|-------|---------|------|--------|
| A | 4000 | Labs | ✓ COMPLETADO |
| B | 4100 | UX | ✓ COMPLETADO |
| C | 4200 | Docs + routes | ✓ COMPLETADO |
| D | 4250 | Perf | ✓ COMPLETADO |
| E | 4255 | UX | ✓ COMPLETADO |
| F | 4290 | Docs | ✓ COMPLETADO |

Serialization required: 4100 → 4255 (nav), 4250 → 4255 (`app/page.tsx`).

## Example active wave

| Agent | Program | Zone | Parallel? |
|-------|---------|------|-----------|
| A | 6000 | Cloud | ✅ with B |
| B | 6500 | Cloud | ⚠️ serialize writes |
| C | 9000 | Network | ✅ with A (read-only DP) |
| D | 4290 | Docs | ✅ with all |

## Escalation path

```
Agent blocked
    → Architecture Owner (zone conflict)
        → Program owner (domain decision)
            → Release Owner (production impact)
```

## Status tracking

- Engineering metadata: [status.json](./status.json)
- Dashboard: `/engineering`
- Master program: `lib/delivery/roadmap-status.ts`
