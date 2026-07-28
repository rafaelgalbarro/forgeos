# Application Command / Query Layer (Program 6020)

UI mutations go through **Commands**; UI reads go through **Queries** and read-model snapshots.

## Layout

```
src/core/application/
  commands/          # CommandBus + command definitions
  queries/           # QueryBus + query definitions
  handlers/          # Command & query handlers
  ports/             # AI, persistence, telemetry, UnitOfWork, …
  policies/          # Authorization policies
  services/          # Idempotency helpers
  dto/               # Read models
  mappers/           # Aggregate → view
  errors/            # ApplicationError contract
  compat-domain/     # Thin aggregates (bridge until full 6010 wiring)
  testing/           # In-memory adapters
```

## Domain dependency (6010)

Prefer `src/core/domain/` (Program 6010) for canonical aggregates.
Handlers currently use `compat-domain/` for a complete CQ pipeline with in-memory UnitOfWork tests. Migrate handlers onto 6010 entities progressively without deleting legacy routes.

## Related docs

- [commands.md](./commands.md)
- [queries.md](./queries.md)
- [ports.md](./ports.md)
- [authorization.md](./authorization.md)
- [idempotency.md](./idempotency.md)
- [transactions.md](./transactions.md)
- [errors.md](./errors.md)

## Presentation adapters

Thin adapters live under `src/presentation/actions` and `src/presentation/queries`.
Legacy bridges: `src/presentation/bridges/legacy-bridges.ts`.
`app/actions/mission-control.ts` and `app/actions/preview-runtime.ts` are **not** deleted.
