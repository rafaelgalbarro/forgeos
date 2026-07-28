# Future: Build Execution Runtime (Epic 3.3)

**Not implemented in Epic 3.2.** Documented for continuity only.

## Planned scope

Activate Build Engine orchestration tasks already registered but not wired to UI:

- `BUILD_PLAN`
- `BUILD_ARCHITECTURE`
- `BUILD_BACKEND`
- `BUILD_FRONTEND`
- `BUILD_DATABASE`
- `BUILD_DEPLOY`
- `BUILD_QA`

## Expected flow

```
Executive Decision (approved) → Build Plan Worker → Architecture → Implementation tasks → QA → Deploy advisory
```

## Constraints (from Epic 3.2)

- Build adapter exists: `lib/platform/build/ai-adapter.ts`
- Task registry entries exist in `task-registry.ts`
- **No activation** in dashboard, CEO Office, or venture workflow until Epic 3.3

## Integration points

- Decision graph: `Build` recommendation nodes → `Approved` build decisions
- Memory: build execution log separate from executive memory
- Observability: same `registerExecutiveObservation` pattern

## Prep done in 3.2

- Orchestration pipeline proven with CEO + Board
- Decision graph node types include build-adjacent `Priority`, `Blocked`
- Docs and task registry ready for migration

When Epic 3.3 starts, extend `runExecutiveIntelligence` or add `runBuildExecutionRuntime` — do not duplicate gateway plumbing.
