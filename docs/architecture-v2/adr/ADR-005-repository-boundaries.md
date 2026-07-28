# ADR-005 — Repository Boundaries

**Status:** Accepted (freeze decision)  
**Date:** 2026-07-24  
**Program:** 6000

## Context

`lib/persistence` provides adapters (`local` default, supabase/postgres stubs) and repositories. Many domains still use private `forgeos-*` localStorage keys (missions, creation-outputs, factories, intelligence). UI sometimes writes localStorage directly. Remote providers are not the productive SoT today.

## Decision

1. **Repositories/adapters** are the only approved persistence boundary for new work.
2. **UI must not write persistence directly.**
3. Default SoT remains **local** until a real remote provider is certified — do not claim Supabase/Postgres durability falsely.
4. Factory and mission stores should migrate behind repositories via adapters (6070), not via silent key renames in 6000.

## Consequences

- New global stores forbidden (freeze-rules).
- Dual-write bridges may be required during migration.
