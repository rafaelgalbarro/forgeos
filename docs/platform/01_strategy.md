# Pilar Strategy

## Responsabilidad

Validación estratégica del venture: discovery de la idea, asesoría al founder, investigación de mercado y simulación de escenarios.

## Módulos

- **Discovery** — clasificación de ideas, preguntas, riesgos de definición
- **Founder Advisor** — riesgos, oportunidades, preguntas estratégicas
- **Research** — informes de mercado y competencia
- **Simulator** — escenarios conservador/base/optimista, venture score

## Adaptadores

| Adaptador | Lib existente |
|-----------|---------------|
| `discovery.adapter.ts` | `@/lib/discovery` |
| `founder-advisor.adapter.ts` | `@/lib/intelligence` |
| `research.adapter.ts` | `@/lib/ai` (tipos) |
| `simulator.adapter.ts` | `@/lib/venture-simulator` |

## Migración

Fase 1 (actual): tipos y stubs. Fase 2: delegar lecturas seguras en adaptadores. Fase 3: orquestación desde `StrategyPillarEngine` sin tocar UI.

## Estado

`scaffold`
