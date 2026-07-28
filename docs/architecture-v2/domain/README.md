# ForgeOS V2 — Canonical Domain Model (PROGRAM 6010)

This folder documents the **official** ForgeOS V2 domain model under `src/core/domain/`.

## Principles

- Single official definition for central entities
- Pure TypeScript — no React, Next.js, Supabase, or provider coupling
- No UI logic
- Legacy types remain; adapters map only
- Domain does not execute factories, deployments, or evolution changes

## Dual surface (intentional during V2 wave)

| Surface | Path | Consumers |
|---------|------|-----------|
| **Canonical rich model** | `src/core/domain/<aggregate>/` (entity, transitions, repository) | 6010 mappers, 6040 state machines, new work |
| **Compat functional stubs** | `src/core/domain/<aggregate>.ts` (flat) | Program 6020 command handlers until cutover |

Flat files **shadow** folder barrels for `import "…/domain/mission"` — use deep imports (`mission/entity`, `mission/transitions`) for the rich model. This is documented debt, not a second alternative canon.

## Contents

| Doc | Topic |
|-----|--------|
| [aggregates.md](./aggregates.md) | Aggregate roots and responsibilities |
| [entity-relations.md](./entity-relations.md) | Official relations between entities |
| [state-machines.md](./state-machines.md) | Valid status transitions |
| [domain-events.md](./domain-events.md) | Canonical event catalog |
| [repository-contracts.md](./repository-contracts.md) | Persistence ports (no Supabase impl yet) |
| [legacy-mapping.md](./legacy-mapping.md) | Best-effort legacy adapters |
| [schema-versioning.md](./schema-versioning.md) | Snapshot migration strategy |

## Entry points

- Compat barrel: `src/core/domain/index.ts`
- Canonical entities: `src/core/domain/*/entity.ts`
- Legacy mappers: `src/legacy/adapters/domain/`
