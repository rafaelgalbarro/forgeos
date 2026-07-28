# Marketing Skills (RC4.5)

Sandbox mock marketing skills for ForgeOS. All execution flows through Runtime + Skills Governance — no real API connections.

## Domains

| Domain | Skill ID | Actions |
|--------|----------|---------|
| Campaigns | `marketing-campaigns` | create, launch, pause, analyze |
| SEO | `marketing-seo` | audit, keywords, rankings, optimize |
| Analytics | `marketing-analytics` | track, report, dashboards |
| Ads | `marketing-ads` | create, bid, budget, performance |
| Social | `marketing-social` | post, schedule, engage, monitor |
| Content | `marketing-content` | create, publish, calendar, assets |
| Email | `marketing-email` | newsletter, sequence, ab_test, send |
| Automation | `marketing-automation` | workflow, trigger, journey, activate |

## Structure

Each provider under `lib/skills/marketing/<domain>/` includes:

- `registry.ts` — skill metadata
- `permissions.ts`, `policies.ts`, `risk.ts`, `rollback.ts`
- `mock-executor.ts`, `sandbox.ts`, `adapter.ts`

## Lab

Open `/lab/marketing-skills` to explore domains, run governed sample executions, and view telemetry/history.

## Governance

High-risk skills (`marketing-ads`, `marketing-email`, `marketing-campaigns`) require elevated approval via the risk engine. All providers default to sandbox mode.
