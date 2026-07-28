# Dual write

Implementation: `src/core/migration/dual-write.ts` (`DualWriteService`).

## Temporary only

Dual-write records:

- `v2Success`, `legacySuccess`
- `divergence`, `retried`, `repaired`
- `retirementCondition` (always present on the result)

Default retirement text (`DEFAULT_DUAL_WRITE_RETIREMENT`):

> Retire dual-write when: (1) V2_PRIMARY for ≥14 days, (2) zero dual-write divergences for 7 days, (3) data migrator checksum parity, (4) rollback drill passed. **Target review date: 2026-10-01.**

## Flag gate

Dual path requires `ENABLE_V2_COMMANDS` **and** `ENABLE_V2_DOMAIN` (or `forceDual` in tests). Otherwise legacy-only write — V1 keeps working.

## Repair

Optional `repair` callback runs when V2 succeeded and legacy failed (typical: re-apply to legacy). Repair failures are logged, never hidden.
