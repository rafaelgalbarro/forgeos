# Programa 2 — Venture Execution

**ID:** `venture-execution`  
**Estado:** `active`  
**Versión programa:** 2030.0.0

## Objetivo

Ejecución técnica: build engine, build plan y conectores de desarrollo.

## Pilares vinculados

- Build (`lib/platform/build`)

## Módulos existentes

| Módulo | Path | UI |
|--------|------|-----|
| Build Engine | `lib/build-engine` | ❌ scaffold |
| Build Plan | `lib/build-plan` | ✅ (compartido con Core) |
| Build Connectors | `lib/platform/build/connectors` | ❌ scaffold |

## Capabilities

- build-engine, build-plan, connectors

## Restricciones v2030.0.0

- **NO** conectar Build Engine a UI
- Connectors permanecen scaffold hasta roadmap platform v1.2

## Epic registry

Vacío (scaffold).

## Código

```
lib/programs/venture-execution/
├── index.ts
├── types.ts
├── program.ts
├── registry.ts
├── modules.ts
└── README.md
```
