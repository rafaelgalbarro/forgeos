# Merge Policy — Program 4290

Rules for merging parallel agent work without breaking ForgeOS.

## Core rules

1. **Never parallel `build` or `reset:dev`** — one Architecture Owner runs per wave
2. **Single `package.json` editor** — dependency changes serialize across all agents
3. **One merge per wave** — batch agent PRs; integrate sequentially through merge queue
4. **Protected core** — any PR touching [protected-core.md](./protected-core.md) requires Architecture Owner approval

## Merge queue order

```
1. Docs-only PRs (4290, audits)     — lowest risk
2. Disjoint zone PRs (verified)     — parallel review OK
3. UX / Navigation PRs              — after docs, before engines
4. Engine PRs (single zone each)    — Runtime → Mesh → AI → Skills
5. Integration PRs (Factories)      — after engine wave
6. package.json / config PRs        — last in wave
```

## Pre-merge checklist

- [ ] Agent declared zone in PR description
- [ ] No overlap with another open PR (paths diff)
- [ ] Read [ownership-map.md](./ownership-map.md) — correct team
- [ ] Read [parallel-execution-matrix.md](./parallel-execution-matrix.md) — compatible programs
- [ ] No unauthorized protected path edits

## Conflict resolution

| Conflict type | Resolver |
|---------------|----------|
| `lib/navigation/*` | UX Team |
| `package.json` | Architecture Owner |
| Engine cross-import | Owning team per [dependency-graph.md](./dependency-graph.md) |
| `docs/` only | Any reviewer |
| Same zone, two PRs | Serialize — merge first PR, rebase second |

## Forbidden merge patterns

- Two PRs merging `sidebar-items.ts` in same wave
- Engine refactor + `reset:dev` script change without coordinated build
- Commercial + Production both changing `lib/launch/changelog.ts`
- Feature PR bundled with `next.config.ts` drive-by edits

## Post-merge

1. Architecture Owner runs **single** `npm run build`
2. Route verify: `/`, `/command-center` (HTTP 200)
3. Release candidate tag only after green build — see [release-governance.md](./release-governance.md)

## Rollback

If merge breaks build:

1. Revert merge commit (not force-push to main)
2. Re-open failed agent task with zone lock
3. Do not run parallel fixes on protected core
