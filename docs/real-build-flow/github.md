# GitHub — Real Build Flow

Allowed (with `ENABLE_REAL_BUILD_FLOW=true` + approval):
- Create private repository
- Create branch `forgeos/init`
- Prepare scaffold structure

Blocked:
- Push to main
- Delete repository
- Public repo without review

Default: dry-run via `generateDryRunPlan("github", ...)`.
