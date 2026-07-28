# ADR-007 — Experience Layer

**Status:** Accepted (freeze decision)  
**Date:** 2026-07-24  
**Program:** 6000

## Context

164 app routes. Core spine evidence: `/` → `/mission-control` → `/studio/*` → factories → `/deployments`. Many lab twins and legacy surfaces (`/command-center`, `/founder`, `/dashboard`, `/creator`). Several redirects already exist (`/missions/*`, `/new-app`, `/resultado`, `/build`).

## Decision

1. **Mission Control is the primary product experience**; Command Center/Founder marked legacy remain until 6060 consolidates.
2. **No route renames/deletes in 6000** — only documentation and existing redirects.
3. Lab routes stay Lab; product/lab duplicates are consolidation candidates, not immediate removals.
4. V2 presentation (`src/presentation/**`, selected `app/*`) is owned by Program **6060**.

## Consequences

- Experience map is the freeze reference for classification.
- Navigation conflict zones serialize per parallel-execution governance.
