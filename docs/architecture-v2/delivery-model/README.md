# Delivery Model V2 — PROGRAM 6050

Canonical pipeline for ForgeOS artifact/output/code unification:

**Artifact → Output → Codebase → Build → Preview → Release → Deployment**

These stages are **not interchangeable**. Each transition uses an explicit adapter or application command.

## Rules

- Artifact ≠ Output ≠ Codebase ≠ Build ≠ Preview ≠ Release ≠ Deployment
- Never delete legacy data without migration
- Do not generate new code when a valid codebase already exists
- Zero React in `src/core/delivery/**`
- Production deployments are governed; **dry-run ≠ real deployment**
- Builds and published Releases are immutable

## Module map

| Path | Role |
|------|------|
| `src/core/delivery/` | Canonical contracts + registries + lineage |
| `src/core/application/delivery-commands.ts` | Application commands (6020 additive) |
| `lib/creation-output/` | Legacy outputs — adapted, not deleted |
| `lib/code-generation/` | Legacy CodeProject — adapted to Codebase |
| `lib/preview-runtime/` | Legacy sandbox — adapted to Preview/Build |
| `lib/preview-deployment/` | Legacy deploy — adapted; dry-run preserved |

## Docs

- [artifact.md](./artifact.md)
- [output.md](./output.md)
- [codebase.md](./codebase.md)
- [build.md](./build.md)
- [preview.md](./preview.md)
- [release.md](./release.md)
- [deployment.md](./deployment.md)
- [lineage.md](./lineage.md)
- [migration.md](./migration.md)

## Verification

```bash
npm run architecture:check
npm run typecheck
npm run test:delivery-6050
npm run build
```

Declare verified only with evidence: `PROGRAM 6050 — ARTIFACT OUTPUT CODEBASE UNIFICATION VERIFICADO`
