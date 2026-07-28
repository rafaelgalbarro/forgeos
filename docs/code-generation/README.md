# PROGRAM 5360 — Real Code Generation

Converts visual outputs and blueprints into **real, complete, exportable code projects**.

## Principles

- **Autonomous projects** — no imports from ForgeOS internals
- **Template-first** — deterministic generation without API keys
- **AI optional** — when `ENABLE_REAL_AI=true` (via AI Runtime adapters)
- **Static validation only** — `STATIC_VALIDATION_PASSED` / `STATIC_VALIDATION_FAILED` (compile = 5370)
- **No execute/deploy** — migration files generated but not executed

## Architecture

```
lib/code-generation/
├── types.ts                  # CodeProject contract
├── code-generation-engine.ts # Orchestrator
├── generators/               # website, webapp, mobile, backend
├── templates/                # manifest.json per stack
├── security/                 # secret + dangerous pattern scanners
├── export/                   # ZIP + manifest exporters
└── e2e-nexora-pipeline.ts    # NEXORA FIELD validation
```

## Routes

- `/studio/[missionId]` — Output Studio (5350)
- `/studio/[missionId]/code` — Código tab (5360)

## Usage

```typescript
import { generateCodeProject, loadCodeStudioServer } from "@/lib/code-generation";

const result = await generateCodeProject({
  missionId: "mc-123",
  ventureName: "My Venture",
  ideaText: "A SaaS platform for teams",
  projectType: "website",
});
```

## See also

- [code-project-contract.md](./code-project-contract.md)
- [template-system.md](./template-system.md)
- [validation.md](./validation.md)
- [security.md](./security.md)
- [export.md](./export.md)
