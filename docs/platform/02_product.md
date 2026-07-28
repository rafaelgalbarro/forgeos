# Pilar Product

## Responsabilidad

Definición de producto: PRD, roadmap, MVP y UX/wireframes.

## Módulos

- PRD, Roadmap, UX, MVP

## Adaptadores

| Adaptador | Lib existente |
|-----------|---------------|
| `prd.adapter.ts` | `@/lib/ai/types/product` |
| `roadmap.adapter.ts` | `@/lib/ai/types/product` |
| `ux.adapter.ts` | `@/lib/domain/venture` |

## Migración

Los adaptadores re-exportan tipos de PRD y secciones de venture. La generación AI sigue en `lib/ai` hasta integración explícita.

## Estado

`scaffold`
