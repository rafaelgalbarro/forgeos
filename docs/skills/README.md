# Skills Framework — RC4

ForgeOS ejecuta acciones externas **únicamente** mediante Skills gobernadas por el Runtime.

## Pipeline

```
Executive Mesh → Decision → Skill Router → Skill → External Tool (sandbox)
  → Execution Result → Runtime → Memory → Decision Graph
```

## Entry point

```ts
import { runSkillRequest } from "@/lib/skills";

const result = await runSkillRequest({
  skillId: "github",
  context: {
    ventureId: "demo-venture-vandl",
    requestedBy: "cto",
    approvedBy: "ceo",
    action: "repository_status",
  },
});
```

## Módulos

| Módulo | Función |
|--------|---------|
| `registry.ts` | 60+ skills catalogados |
| `router.ts` | Routing automático con fallback |
| `executor.ts` | Execution plans + mock (sin APIs reales) |
| `security.ts` | Sandbox, rate limits, audit |
| `store.ts` | Audit logs, telemetry, history |
| `pipeline.ts` | `runSkillRequest()` |

## Lab

`/lab/skills`

## Docs

- [architecture.md](./architecture.md)
- [registry.md](./registry.md)
- [security.md](./security.md)
- [permissions.md](./permissions.md)
- [telemetry.md](./telemetry.md)
