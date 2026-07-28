# Pilar CEO

## Responsabilidad

Orquestación ejecutiva: resumen, briefing diario, revisión de ventures, análisis de riesgo y sesiones de board.

## Regla crítica

El **engine NO importa** `lib/ceo` ni `lib/fos`. Los adaptadores son puentes opcionales marcados como **not connected**.

## Adaptadores

| Adaptador | Estado |
|-----------|--------|
| `ceo-office.adapter.ts` | Tipos de `@/lib/ceo-office` — no conectado |
| `fos-kernel.adapter.ts` | Stub FOS — no conectado |

## Migración

Conectar adaptadores en fases posteriores sin acoplar el engine a runtime pesado de CEO Office.

## Estado

`scaffold`
