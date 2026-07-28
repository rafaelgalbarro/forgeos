# Programa 1 — Venture Core

**ID:** `venture-core`  
**Estado:** `active`  
**Versión programa:** 2030.0.0

## Objetivo

Estrategia, producto y operaciones de estudio: discovery, portfolio, simulación, export y design system.

## Pilares vinculados

- Strategy (`lib/platform/strategy`)
- Product (`lib/platform/product`)
- Studio (`lib/platform/studio`) — portfolio, knowledge

## Módulos existentes

| Módulo | Path | UI |
|--------|------|-----|
| Discovery | `lib/discovery` | ✅ |
| Portfolio | `lib/portfolio` | ✅ |
| Intelligence | `lib/intelligence` | ✅ |
| Venture Simulator | `lib/venture-simulator` | ✅ |
| Build Plan | `lib/build-plan` | ✅ |
| Export | `lib/export` | ✅ |
| Design System | `lib/design-system` | ✅ |
| Knowledge | `lib/knowledge` | ✅ |

## Capabilities

Registradas en `lib/programs/venture-core/registry.ts`:

- discovery, portfolio, simulator, export, design-system, knowledge

## Epic registry

Vacío (scaffold) — se poblará en 2030.1.

## Notas

- `lib/build-plan` también referenciado por Venture Execution; owner primario en mapping: venture-core.
- No mover módulos; solo referencia en `modules.ts`.

## Código

```
lib/programs/venture-core/
├── index.ts
├── types.ts
├── program.ts
├── registry.ts
├── modules.ts
└── README.md
```
