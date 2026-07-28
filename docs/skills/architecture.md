# Skills Architecture

```
lib/skills/
  types.ts
  registry.ts      — Skill catalog
  router.ts        — Skill Router
  executor.ts      — Mock executor + execution plans
  validator.ts
  policies.ts
  permissions.ts
  security.ts
  store.ts         — Audit, telemetry, history
  pipeline.ts      — runSkillRequest()
  adapters/
    runtime-adapter.ts
    memory-adapter.ts
```

## Rules

- No direct external API calls from business modules
- AI skills route through AI Runtime, never direct OpenAI/Claude
- All executions pass through Runtime adapter
- Sandbox mode by default (RC4)
