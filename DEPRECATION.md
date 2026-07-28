<!-- DEPRECATION:PROGRAM_6070 -->

# Deprecation — PROGRAM 6070

Legacy contracts are **not** deleted while consumers exist.

## Gates (all required before REMOVED)

1. Zero consumers
2. Data migrated + checksum parity
3. Tests green (V2-only matrix)
4. Observability clear (no legacy traffic)
5. Rollback proven

## Tracked surfaces (examples)

| Legacy | Prefer | Component |
|--------|--------|-----------|
| `lib/mission-control` mission persistence reads | DualRead + `src/core/domain/mission` | mission.reads |
| `lib/mission-control/decision-center.ts` | DualWrite + `src/core/domain/decision` | decisions |
| `lib/creation-output` reads | DualRead + `src/core/domain/output` | outputs |

Runtime helpers: `src/core/migration/deprecation.ts`.

Docs: `docs/architecture-v2/migration/deprecation.md`.
