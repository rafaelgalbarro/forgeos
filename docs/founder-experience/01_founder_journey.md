# Founder Journey (Epic 7.1)

## Objetivo

Recorrido oficial del fundador: un camino guiado desde la idea hasta el lanzamiento. El fundador **no ve** Runtime, Workers ni Build Context. La experiencia transmite que ForgeOS le acompaña en cada hito.

## Ruta

`/founder-journey?ventureId=<uuid>`

Si no hay `ventureId`, se usa la venture más reciente del portfolio o un venture demo.

## 15 fases (orden oficial)

| # | Fase | Objetivo resumido |
|---|------|-------------------|
| 1 | Idea | Articular la oportunidad |
| 2 | Discovery | Contexto y preguntas clave |
| 3 | Validación | Análisis inicial de mercado |
| 4 | Research | Evidencia y tendencias |
| 5 | Competidores | Landscape y diferenciación |
| 6 | CEO Review | Hito ejecutivo (prosa, no chatbot) |
| 7 | Board Decision | Hito de gobernanza |
| 8 | Product | PRD y MVP |
| 9 | Architecture | Blueprint técnico |
| 10 | UX | Flujos y wireframes |
| 11 | Build | Construcción del MVP |
| 12 | QA | Calidad y pruebas |
| 13 | Deployment | Entorno listo |
| 14 | Launch | Landing y beta |
| 15 | Growth | KPIs y escalado |

Cada fase muestra: **objetivo**, **progreso**, **bloqueos**, **siguiente acción**, **tiempo estimado**, **valor generado**.

## Motor heurístico

`lib/founder-journey/journey-engine.ts` deriva el estado desde `VentureProject` (secciones, discovery, research, PRD, simulator persistido, status). No invoca runtime ni workers.

## Coexistencia con pipeline 7.0

Pipeline usuario (7 pasos): Idea → Validación → Mercado → Producto → Construcción → Lanzamiento → Crecimiento.

Se calcula en `journey-timeline.ts` (`computeUserPipelineProgress`) como vista agregada de las 15 fases. Ambas conviven en la UI.

## Componentes

- `FounderJourneyView` — vista principal
- `JourneyTimeline` — stepper horizontal de fases
- `JourneyPhaseCard` — detalle de fase activa
- `JourneyProgressHeader` — progreso global + pipeline resumido

## Enlace desde venture workspace

Enlace sutil «Tu recorrido» en la barra superior del workspace (`/founder-journey?ventureId=…`).
