# Agent Playbook — Program 4290

Mandatory workflow for Cursor agents (and human contributors) before editing ForgeOS.

## 1. Read before edit

| Document | When |
|----------|------|
| [ownership-map.md](./ownership-map.md) | Always — confirm team owner |
| [dependency-graph.md](./dependency-graph.md) | Before cross-`lib/` imports |
| [parallel-execution-matrix.md](./parallel-execution-matrix.md) | Before starting work if other agents active |
| [protected-core.md](./protected-core.md) | Before touching shell, nav, engines |
| [safe-zones.md](./safe-zones.md) | Before declaring work |
| [folder-ownership.md](./folder-ownership.md) | When path ownership is unclear |

## 2. Declare zone

At task start, state:

```
PROGRAM: <number>
ZONE: <from safe-zones.md>
PATHS: <explicit folders>
OWNER: <team>
```

## 3. Stop conditions

**Stop immediately** if:

- Target path is owned by another team and you lack assignment
- Path is in [protected-core.md](./protected-core.md) Tier 0–2 without charter
- Another agent holds the same zone
- Task requires `package.json`, `build`, or `reset:dev` and you are not Architecture Owner
- Program pair is ❌ in [parallel-execution-matrix.md](./parallel-execution-matrix.md)

Report: *"BLOCKED — wrong owner / zone / protected path: `<path>`"*

## 4. Allowed without escalation

- `docs/**` documentation (including `docs/engineering/`)
- Read-only inspection of any path
- Lab harness pages under `app/lab/` when domain owner matches
- Static metadata pages (`app/engineering/`) — Architecture Owner

## 5. Edit discipline

- **Minimize scope** — only files required by program charter
- **No drive-by refactors** in protected or adjacent engines
- **No new `lib/` top-level folders** without Master Program entry
- **Match conventions** — read surrounding code first
- **Documentation as contract** — update `docs/<domain>/` when changing public `lib/` API

## 6. Build discipline

See [build-policy.md](./build-policy.md). Agents do **not** run `npm run build` unless assigned as Architecture Owner for the wave.

## 7. Handoff template

```markdown
## Agent Handoff — Program <N>

**Zone:** <zone>
**Paths touched:** <list>
**Owner verified:** yes/no
**Protected paths:** none | <list + approval>
**Parallel safe:** yes/no per matrix
**Build run:** pending | pass | N/A (docs-only)
**Next agent:** <zone release or follow-up>
```

## 8. Program 4290 scope reminder

Governance agents: **documentation only**. No Runtime, Mesh, AI, Skills, or UX behavior changes unless explicitly chartered.
