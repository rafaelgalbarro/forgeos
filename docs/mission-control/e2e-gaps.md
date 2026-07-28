# PROGRAM 5150 — E2E Gaps

## Resolved in 5150

- Mission session infrastructure (session, runner, validator, history, repository)
- Type contracts for MissionIntent, MissionSession, MissionStage, MissionArtifact, MissionValidationScores
- Dual intention classification (VENTURE + APPLICATION)
- CEO rationale for venture/web/website/mobile
- Mission plan generator (22 PLAN stages)
- Build phase previews via factory adapters (on-demand)
- Validation scores via venture-intelligence + architecture-review adapters
- Deploy preview (no production)
- Operate/Evolve previews
- Repository pattern (localStorage in repository layer only)
- `/missions/[missionId]` route
- MissionControlToolbar (Pause, Resume, Auto-continue, Decisions, Artifacts, Open venture)
- ValidationScoresPanel in right column
- NEXORA FIELD generic fixture
- Server actions for on-demand engines

## Pending / Future

| Gap | Priority | Notes |
|-----|----------|-------|
| Real AI conversation for understanding | Medium | Currently heuristic CEO responses |
| Venture auto-creation from mission | Medium | Manual fixture seed for now |
| Mission → venture slug linking on BUILD | Low | ventureSlug derived from idea text |
| Full autonomous stage advance loop | Low | Manual/auto-pilot via existing 5500 |
| E2E Playwright test suite | Medium | Script-based validation only |
| Supabase/API persistence adapter | Low | localStorage sufficient for 5150 |
| Real Build Flow dry-run integration | Low | Build pipeline dry-run may need venture ID |
| Mobile factory only when valuable | Done | Conditional on idea keywords |
| Executive board per-stage trigger | Low | Existing board trigger unchanged |

## Known Limitations

1. **Scores are heuristic** — marked as `demo` or `heuristic` in artifacts
2. **Build previews create factory projects** — in-memory/demo only
3. **Deploy phase** — plan document only, no GitHub/Vercel API calls
4. **Persistence** — browser localStorage; no cross-device sync
5. **NEXORA fixture** — static data; not auto-generated from mission conversation

## Build Risks

- `getBuildPipelineSnapshot` requires valid venture ID — falls back to demo on error
- `buildBuildContextFromVenture` needs `persist: false` to avoid SSR localStorage writes

## Verification Status

Run `npm run build` and route checks to confirm. See `e2e-validation.md` for checklist.
