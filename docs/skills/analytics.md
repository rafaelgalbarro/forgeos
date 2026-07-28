# Analytics Skills (RC4.6)

ForgeOS analytics skills platform — all execution is **mock/sandbox** via Runtime + Skills Governance.

## Domains

| Skill ID | Domain | Actions |
|----------|--------|---------|
| `analytics-dashboards` | Dashboards | create, widgets, share, refresh |
| `analytics-reports` | Reports | generate, schedule, export, distribute |
| `analytics-kpis` | KPIs | define, track, alert, benchmark |
| `analytics-forecast` | Forecast | models, scenarios, projections |
| `analytics-predictions` | Predictions | ml_insights, trends, anomalies |
| `analytics-metrics` | Metrics | collect, aggregate, query, visualize |

## Structure

Each provider under `lib/skills/analytics/<domain>/` exports: `types`, `registry`, `permissions`, `policies`, `risk`, `rollback`, `mock-executor`, `sandbox`, `adapter`, `index`.

## Execution

- Registered in `lib/skills/registry.ts`
- Mock execution via `lib/skills/analytics/executor-bridge.ts` → `runSkillRequest` / `runGovernedSkillRequest`
- Lab UI: `/lab/analytics-skills`

## Constraints

- No real API connections
- Adapters route through `runtime-adapter` only
- `sandboxOnly: true` — never production default
