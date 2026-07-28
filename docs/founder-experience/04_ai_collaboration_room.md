# AI Collaboration Room (Epic 7.4)

Sala de reunión ejecutiva entre AIs — **no es un chat**. Sesión estructurada para deliberación y consenso.

## Ruta

`/lab/ai-collaboration` — aislada del Dashboard, igual que `/lab/executive-runtime`.

## Participantes

| Rol | Función en la sala |
|-----|-------------------|
| CEO, CTO, CMO, CFO, Legal, Growth, Research | Ejecutivos con opinión, argumentos, confianza, riesgos y voto |
| Founder | Observador y decisor final — no escribe en chat |

## Flujo de reunión

1. El fundador pulsa **Iniciar reunión ejecutiva**.
2. `runAiCollaborationLab()` orquesta:
   - `runExecutiveIntelligence` — pipeline CEO + board + memoria
   - `runExecutiveBoardSession` — opiniones por miembro
   - `buildConsensus` — consenso sobre el subconjunto de 7 ejecutivos
   - `getExecutiveGraphForVenture` — nodos del grafo de decisiones
3. La UI muestra tarjetas de mesa ejecutiva, panel de consenso y snippet del decision graph.

## Integraciones

| Módulo | Uso |
|--------|-----|
| `lib/ceo-office/executive-runtime.ts` | `runExecutiveIntelligence` |
| `lib/intelligence/board-runtime.ts` | `runExecutiveBoardSession` |
| `lib/intelligence/consensus-engine.ts` | `buildConsensus` |
| `lib/ai-orchestration/decision-graph-writer.ts` | `getExecutiveGraphForVenture` |

## Fallback

Funciona sin API keys: el board runtime devuelve opiniones heurísticas o mock; el consenso se calcula localmente.

## Archivos

- `lib/lab/ai-collaboration-lab.ts` — orquestación
- `components/lab/AiCollaborationRoom.tsx` — UI de sala ejecutiva
- `app/lab/ai-collaboration/page.tsx` — página lab
