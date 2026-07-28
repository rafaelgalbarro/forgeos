# Feature flags — PROGRAM 6070

Central reader: `src/core/migration/feature-flags.ts`

| Flag | Default | Role |
|------|---------|------|
| `ENABLE_V2_DOMAIN` | `false` | Domain aggregate preference |
| `ENABLE_V2_COMMANDS` | `false` | Command dual-write / V2 dispatch |
| `ENABLE_V2_QUERIES` | `false` | Dual-read / V2 reads |
| `ENABLE_V2_ORCHESTRATION` | `false` | Orchestration kernel path |
| `ENABLE_V2_EVENTS` | `false` | V2 event bus |
| `ENABLE_V2_STUDIO` | `false` | Studio outputs/codebases |
| `ENABLE_V2_COMPANY_OS` | `false` | Company overview V2 |

Documented in `.env.example`. Gradual by default.

## Verification matrices

See `FLAG_MATRICES` in code:

1. **allOff** — legacy only
2. **domainOnly**
3. **queriesOnly**
4. **commandsAndQueries**
5. **orchestration**
6. **fullV2Candidate** — documented dry-run only until consumers ready

With **allOff**, ForgeOS V1 paths must keep working.
