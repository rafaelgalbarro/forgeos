# ADR-006 — Legacy Adapters

**Status:** Accepted (freeze decision)  
**Date:** 2026-07-24  
**Program:** 6000

## Context

Domain duplication is systemic (Mission session vs UI, VentureProject vs V2 Venture, dual Workspace, dual MissionEvent, Release name collisions). Bridges already exist (`lib/persistence/bridges/*`, `mission-session.ts`, live-mission adapters). Deleting legacy types would break the app.

## Decision

1. **Legacy adapters map; they do not rewrite consumers in place** during early V2 programs.
2. Compatibility is mandatory: dual-read, redirects, versioned schemas as needed.
3. Adapter ownership belongs to Program **6070** (`src/core/migration/**` and approved maps); 6000 only documents candidates.
4. No type deletions or repository substitutions in 6000.

## Consequences

- Recommended adapter candidates are listed in [domain-duplication-map.md](../domain-duplication-map.md) and [migration-matrix.md](../migration-matrix.md).
- “Canonical exists in src” ≠ “app uses it.”
