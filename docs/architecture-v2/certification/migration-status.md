# Migration Status — PROGRAM 6080 / 6070

**Refs:** [`../migration-matrix.md`](../migration-matrix.md), [`../migration/strategy.md`](../migration/strategy.md), `src/core/migration/**`

## Feature flags (defaults)

All V2 flags default **false** (`src/core/migration/feature-flags.ts`):

| Flag | Default |
|------|---------|
| ENABLE_V2_DOMAIN | false |
| ENABLE_V2_COMMANDS | false |
| ENABLE_V2_QUERIES | false |
| ENABLE_V2_ORCHESTRATION | false |
| ENABLE_V2_EVENTS | false |
| ENABLE_V2_STUDIO | false |
| ENABLE_V2_COMPANY_OS | false |

**Implication:** Legacy `lib/*` remains authoritative. Enabling flags without a green build is unsafe.

## Adapter / runner inventory (exists)

- Dual-read / dual-write modules under `src/core/migration/`
- Runners: migrate-v2-missions, decisions, outputs
- Adapters: missions, decisions, artifacts, outputs, codebases, builds, previews, deployments, company-overview
- Deprecation + rollback helpers present

## Certification stance

| Question | Answer |
|----------|--------|
| Is migration complete? | **No** |
| Is dual-write proven in production traffic? | **Not certified** |
| Can we flip SoT to V2 domain? | **No** — domain stubs + build fail + flags OFF |
| Legacy routes silently deleted? | **No evidence of hard deletes**; experience map uses redirects / legacy labels |

## Legacy compatibility

See [`../experience-map.md`](../experience-map.md). Routes classified Core / Legacy / Lab / Candidate for redirect. Live HTTP health **not verified** in this run (smoke NOT_RUN) — neither “all healthy” nor “silently broken” is claimed without status codes.
