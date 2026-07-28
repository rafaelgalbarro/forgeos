# Migration strategy — PROGRAM 6070

## Goals

Progressively migrate ForgeOS V1 → V2 with stability and rollback capability.

## Non-negotiables

- **NO** big-bang rewrite
- **NO** delete data before validation
- **NO** retire legacy contracts while consumers exist
- **NO** hide incompatibilities (fallbacks + divergences are telemetry)

## Pattern

**Strangler by flow (A–J)**, not mass rewrite:

| Flow | Component |
|------|-----------|
| A | Mission reads |
| B | Mission commands |
| C | Decisions |
| D | Artifacts |
| E | Outputs |
| F | Codebases |
| G | Builds |
| H | Previews |
| I | Deployments |
| J | Company overview |

## Status ladder

`NOT_STARTED` → `ADAPTER_READY` → `DUAL_READ` → `DUAL_WRITE` → `V2_PRIMARY` → `LEGACY_READ_ONLY` → `DEPRECATED` → `REMOVED`

Advance only with evidence in the registry.

## Additive layers

Migration sits beside Programs 6000–6060. Core engines remain React-free; admin UI may use React/FHIS.

## Default posture

All `ENABLE_V2_*` flags **false**. With flags off, legacy barrels remain authoritative.
