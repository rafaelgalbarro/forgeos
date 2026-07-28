# Programa 3 — Venture Intelligence

**ID:** `venture-intelligence`  
**Estado:** `scaffold`  
**Versión programa:** 2030.0.0

## Objetivo

Capa de inteligencia, memoria y orquestación ejecutiva (CEO, Board, FOS).

## Pilares vinculados

- Intelligence (`lib/platform/intelligence`)
- CEO (`lib/platform/ceo`)

## Módulos existentes

| Módulo | Path | Conexión |
|--------|------|----------|
| Intelligence Layer | `lib/intelligence-layer` | Parcial / activo |
| CEO | `lib/ceo` | ❌ desconectado |
| Board | `lib/board` | ❌ desconectado |
| FOS Kernel | `lib/fos` | ❌ desconectado |

## Capabilities

- memory, decision-engine (activos vía intelligence-layer)
- pattern-engine, ceo-office, board, fos-kernel (scaffold)

## Marcadores de desconexión

Los módulos CEO, Board y FOS tienen `connected: false` en `modules.ts`. No deben importarse desde `app/` hasta épica aprobada.

## Epic registry

Vacío (scaffold).

## Roadmap relacionado

- Platform v2.0 — CEO + Studio orchestration
- Intelligence-layer docs en `docs/intelligence-layer/`

## Código

```
lib/programs/venture-intelligence/
├── index.ts
├── types.ts
├── program.ts
├── registry.ts
├── modules.ts
└── README.md
```
