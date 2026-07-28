# Developer & Cloud Skills (RC4.2)

Sandbox provider modules for software creation, deployment, and maintenance. **No real API connections** — all execution flows through Runtime + Skills Governance.

## Providers

| Kind | Provider | Skill ID | Actions |
|------|----------|----------|---------|
| Developer | GitHub | `github` | repository, PR, workflow ops |
| Developer | GitLab | `gitlab` | project, MR, pipeline ops |
| Developer | Docker | `docker` | image build, container ops |
| Cloud | Vercel | `vercel` | preview/production deploy |
| Cloud | Cloudflare | `cloudflare` | worker deploy, CDN, DNS |
| Cloud | Supabase | `supabase` | project, migration, query |
| Cloud | AWS | `aws` | EC2, S3, Lambda (mock) |
| Cloud | Azure | `azure` | resource groups, functions |
| Cloud | GCP | `gcp` | Cloud Run, storage |

## Architecture

```
runSkillRequest → runGovernedSkillRequest → executor → provider-router → mock-executor
                                              ↓
                                    runtime-adapter (dispatch)
```

Each provider module exports: registry, permissions, policies, risk, rollback, telemetry, audit, mock-executor, sandbox config, and adapter.

## Lab

Open `/lab/developer-skills` to visualize providers, projects, repositories, deployments, containers, cloud resources, health, and telemetry.

## Constraints

- Sandbox mode only — production blocked by governance
- Adapters route through `runtime-adapter.ts` — never direct HTTP
- Registered in `lib/skills/registry.ts` via developer/cloud registries
