# Creator Flow (Epic 7.7)

## Objetivo

Experiencia continua y definitiva de creación de startups en `/creator`. Un único flujo guiado:

**Idea → Discovery → Research → CEO → Board → Product → Architecture → Build → Deploy → Growth**

## Ruta

`/creator?ventureId=<uuid>`

- Sin `ventureId`: usa la venture más reciente del portfolio o un venture demo.
- Permite iniciar un venture nuevo (enlace a `/`) o continuar uno existente.

## Integración (sin duplicar lógica)

| Paso | Módulo reutilizado | Adaptador |
|------|-------------------|-----------|
| Idea, Discovery | `lib/founder-journey/` | `adaptJourneyProgress` |
| Todos | `lib/venture-workspace/` | `adaptWorkspaceSnapshot` |
| Research | `lib/knowledge/` | `adaptKnowledgeRefs` |
| CEO | `lib/venture-workspace/ceo-brief` | `adaptCeoBrief` |
| Board | Venture Simulator + journey | `adaptBoardDecision` |
| Timeline | `lib/venture-timeline/` | `adaptTimelineHighlights` |
| Build, Deploy | `lib/build-platform/release-manager` | `adaptReleaseSummary`, `adaptBuildStatus` |
| Runtime | `lib/runtime/execution-engine` | `adaptBuildPipelineLabel` (etiquetas fundador) |

El orquestador (`lib/creator-flow/creator-orchestrator.ts`) compone estos adaptadores. **No** expone Event Bus, Worker ni Scheduler al fundador.

## Cada paso muestra

1. **Qué ha pasado** — highlights del timeline y memoria del venture
2. **Qué hacer ahora** — siguiente acción heurística
3. **CTA** — avanzar paso (mock/heurístico donde motores no están cableados) o enlace al detalle
4. **CEO / Board** — resumen ejecutivo en prosa (`ExecutiveCard`), no chat

## Componentes

- `CreatorFlowView` — experiencia continua principal
- `CreatorStepper` — pipeline de 10 pasos (horizontal)
- `CreatorStepPanel` — contenido del paso activo
- `CreatorProgressBar` — progreso global

## Enlaces embebidos

Sin romper la navegación del flujo, enlaces a:

- `/founder-journey?ventureId=…`
- `/venture/[id]` (workspace)
- `/ceo` (CEO Workspace)

## Coexistencia

- `/dashboard`, `/founder`, `/founder-journey`, `/ceo`, `/venture/[id]` permanecen intactos.
- `lib/creator-flow/` es la capa de orquestación; no duplica motores existentes.

## Store

`creator-store.ts` — estado del flujo por venture en memoria + `localStorage` (`forgeos-creator-flow`).

---

## Program 3 — Venture Creator RC1 COMPLETE

Con la integración de Epic 7.7, el Program 3 — Venture Creator alcanza **RC1**:

| Epic | Módulo | Estado |
|------|--------|--------|
| 7.0 | Venture Workspace | Integrado |
| 7.1 | Founder Journey | Integrado |
| 7.2 | CEO Workspace | Integrado |
| 7.3 | Venture Timeline | Integrado |
| 7.5 | Knowledge (`lib/knowledge`) | Integrado vía adaptador |
| 7.7 | Creator Flow (capstone) | **Este epic** |

El Creator Flow unifica la experiencia fundador en un pipeline de 10 pasos con orquestación fina sobre los módulos existentes.
