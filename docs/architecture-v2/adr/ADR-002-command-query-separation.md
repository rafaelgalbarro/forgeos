# ADR-002 — Command Query Separation

**Status:** Accepted (directional freeze)  
**Date:** 2026-07-24  
**Program:** 6000

## Context

Today, UI and server actions often call coordinator/engine functions directly (e.g. `conversation-engine` from `MissionControlShell`, enterprise `*-engine` from components). There is no complete application command/query layer in productive use. `src/core/application/**` is reserved for Program 6020.

## Decision

1. New write paths should be expressed as **commands**; reads as **queries**, implemented under `src/core/application/**` when 6020 lands.
2. Until then, do not add more presentation→engine call sites; prefer existing coordinators/facades.
3. Domain remains free of UI and providers.

## Consequences

- 6020 owns ports/handlers; this ADR freezes the separation intent.
- Existing engine calls are legacy debt, not a license to add more.
