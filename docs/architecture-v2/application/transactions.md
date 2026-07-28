# Transactions (Program 6020)

## UnitOfWork

Handlers call `uow.begin()` → mutate repos + append events → `uow.commit()` (or `rollback()` on failure).

## Limitations

Current ForgeOS persistence (localStorage / repository adapters) does **not** provide true multi-entity ACID transactions.

In-memory UnitOfWork for tests stages changes and applies them atomically on commit. Production adapters should best-effort batch and avoid partial commits:

- Mission + Event together
- Output create + Mission.outputIds update together
- Release approve must persist `approvalId` with the Release

When persistence cannot guarantee atomicity, document the gap and prefer compensating actions / dual-write migration (Program 6040/migration) rather than silent partial success.
