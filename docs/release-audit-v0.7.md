# Release Audit v0.7

**Fecha:** 2026-07-02  
**Alcance:** Releases 0.4 → 0.7 (FOS, CEO, Board, Build Engine) + capa de integración CEO Office  
**Método:** Inspección estática del código, trazado de imports, estado de rutas. **Sin modificaciones de código.**

---

## Resumen ejecutivo

| Release | Código en repo | Integrado en `/dashboard` | Veredicto global |
|---------|----------------|---------------------------|------------------|
| **0.4** FOS | Sí — `lib/fos/` completo | **No** | **Parcial** |
| **0.5** CEO | Sí — `lib/ceo/` completo | **No** | **Parcial** |
| **0.6** Board | Sí — `lib/board/` completo | **No** | **Parcial** |
| **0.7** Build Engine | Sí — `lib/build-engine/` casi completo | **No** | **Parcial** |

**Estado activo de `/dashboard`:** Release **0.2.5** — `components/dashboard/DashboardView.tsx` vía `app/dashboard/page.tsx`.  
**Único entrypoint a 0.4–0.7:** `lib/ceo-office/index.ts` → `components/ceo-office/CeoOfficeView.tsx` (actualmente **aislado**).

Tras la recuperación de estabilidad (jul 2026), ningún módulo 0.4–0.7 participa en el bundle de `/dashboard`. El código existe pero está desconectado de la ruta activa.

---

## Contexto: cadena de dependencias (cuando CEO Office está activo)

```
app/dashboard/page.tsx
  └─ CeoOfficeView                    [AISLADO]
       └─ useCeoOfficeData
            └─ safeBuildCeoOfficeData
                 ├─ runFos()              ← 0.4
                 ├─ runCeoEngine()          ← 0.5 (+ 0.6 board embebido)
                 ├─ runBuildEngine()      ← 0.7
                 ├─ lib/live, headquarters, health, notifications  ← 0.3
                 └─ lib/portfolio (métricas base)
```

Con `DashboardView` activo, **ninguna** de estas ramas se importa en tiempo de compilación para `/dashboard`.

---

## Release 0.4 — FOS (ForgeOS Kernel)

**Objetivo declarado:** kernel, event-bus, scheduler, engines de portfolio/prioridad/atención/decisión, lifecycle, context, workers.

### Estado por componente

| Componente | Archivos | Estado | Notas |
|----------|----------|--------|-------|
| Kernel + `runFos()` | `lib/fos/kernel/index.ts` | **Implementado** | Orquesta engines, emite eventos, devuelve `FosSnapshot` |
| Event bus | `lib/fos/event-bus/index.ts` | **Implementado** | `createEventBus`, `getSharedEventBus`, historial |
| Scheduler | `lib/fos/scheduler/index.ts` | **Parcial** | Pipeline definido; en kernel se hace `void pipeline` — **no ejecuta tareas programadas** |
| Portfolio engine | `lib/fos/portfolio-engine/index.ts` | **Implementado** | Métricas + health assessment |
| Priority engine | `lib/fos/priority-engine/index.ts` | **Implementado** | |
| Attention engine | `lib/fos/attention-engine/index.ts` | **Implementado** | |
| Decision engine | `lib/fos/decision-engine/index.ts` | **Implementado** | Usado también por board session |
| Lifecycle engine | `lib/fos/lifecycle-engine/index.ts` | **Implementado** | Usado en `lib/ceo/venture-review.ts` |
| Context engine | `lib/fos/context-engine/index.ts` | **Implementado** | |
| Worker coordinator | `lib/fos/worker-coordinator/index.ts` | **Implementado** | Emite `fos:live:activity` |
| State machine | `lib/fos/state-machine/index.ts` | **Parcial** | Exportado; **no integrado en `runFos()`** |
| Memory | `lib/fos/memory/index.ts` | **Parcial** | `writeFosMemory` en cada run; **`readFosMemory` / `clearFosMemory` sin consumidores** |
| Barrel `lib/fos/index.ts` | 14 archivos bajo `lib/fos/` | **Implementado** | Re-exporta ~15 símbolos; solo se importa desde `lib/ceo-office` y puentes |
| FOS bridges | `lib/portfolio/fos-bridge.ts`, `lib/health/fos-bridge.ts`, `lib/live/fos-bridge.ts` | **Parcial** | `init*FosBridge()` solo desde `buildCeoOfficeData`; getters **sin uso** |
| Integración UI / rutas | — | **No implementado** | Desconectado tras rollback a 0.2.5 |

### Importadores de `@/lib/fos` (activos en repo)

| Consumidor | Uso |
|------------|-----|
| `lib/ceo-office/index.ts` | `runFos`, `FosSnapshot` |
| `lib/ceo/*.ts` | Tipos + `resolvePrimaryDecision`, `resolveLifecycleState` |
| `lib/board/session/index.ts` | `resolvePrimaryDecision` |
| `lib/*/fos-bridge.ts` | `getSharedEventBus` |

**Ningún import desde `app/` ni `components/dashboard/`.**

---

## Release 0.5 — CEO Engine

**Objetivo declarado:** motor CEO, daily briefing, executive summary, recomendaciones, riesgos, oportunidades, reviews.

### Estado por componente

| Componente | Archivos | Estado | Notas |
|----------|----------|--------|-------|
| `runCeoEngine()` | `lib/ceo/ceo-engine.ts` | **Implementado** | Compone salida completa; integra board (0.6) |
| Morning brief | `lib/ceo/daily-briefing.ts` | **Implementado** | Mostrado en CEO Office vía `CeoBriefingCard` |
| Weekly / monthly review | `lib/ceo/daily-briefing.ts` | **Parcial** | **Calculados pero sin panel UI** |
| Executive summary | `lib/ceo/executive-summary.ts` | **Implementado** | UI: `CeoInsightsPanel` (desconectado) |
| Recommendation | `lib/ceo/recommendation-engine.ts` | **Implementado** | UI: `CeoInsightsPanel` |
| Risk analysis | `lib/ceo/risk-analysis.ts` | **Implementado** | UI: `CeoInsightsPanel` |
| Opportunities | `lib/ceo/opportunity-engine.ts` | **Implementado** | UI: `CeoInsightsPanel` |
| Venture reviews | `lib/ceo/venture-review.ts` | **Parcial** | **Calculados; sin componente que los muestre** |
| Priority | `lib/ceo/priority.ts` | **Implementado** | Parcialmente reflejado en insights |
| CEO memory | `lib/ceo/memory.ts` | **Parcial** | `recordBriefing` sí; **`readCeoMemory`, `recordReview` sin llamadas** |
| `buildCEOBriefing` wrapper | `lib/ceo/index.ts` | **Parcial** | Delega a `lib/portfolio/ceo-briefing` — duplicación de API |
| `buildDailyReport` / `buildExecutiveSummary` | `lib/ceo/index.ts` | **Parcial** | Solo consumidos por `lib/ceo-office` |
| `buildPriorityQueue` | `lib/ceo/index.ts` | **No implementado** (en uso) | Exportado, **sin importadores** |
| Integración `/dashboard` | — | **No implementado** | |

### Importadores de `@/lib/ceo`

| Consumidor | Uso |
|------------|-----|
| `lib/ceo-office/index.ts` | `runCeoEngine`, `buildExecutiveSummary`, `buildDailyReport` |
| `components/ceo-office/CeoInsightsPanel.tsx` | Tipo `CeoEngineOutput` |

---

## Release 0.6 — Executive Board

**Objetivo declarado:** debate, consenso, votación, sesión de board, panel UI.

### Estado por componente

| Componente | Archivos | Estado | Notas |
|----------|----------|--------|-------|
| Debate | `lib/board/debate/index.ts` | **Implementado** | Heurístico por rol (CEO, CTO, CFO…) |
| Consensus | `lib/board/consensus/index.ts` | **Implementado** | |
| Voting `castVotes` | `lib/board/voting/index.ts` | **Implementado** | Usado en `createBoardSession` |
| Voting `tallyVotes` | `lib/board/voting/index.ts` | **No implementado** (en uso) | Exportado, **sin llamadas** |
| Session | `lib/board/session/index.ts` | **Implementado** | Pipeline debate → consensus → votes |
| Board engine | `lib/board/board-engine/index.ts` | **Implementado** | `runBoardEngine`, `getDefaultBoardQuestion` |
| Members | `lib/board/member/index.ts` | **Implementado** | Perfiles de miembros |
| `BoardPanel` UI | `components/ceo-office/BoardPanel.tsx` | **Implementado** | Pros/contras/riesgos/oportunidades + decisión |
| Integración directa en rutas | — | **No implementado** | Solo vía `runCeoEngine` → CEO Office |

### Importadores de `@/lib/board`

| Consumidor | Uso |
|------------|-----|
| `lib/ceo/ceo-engine.ts` | `runBoardEngine` |
| `lib/ceo-office/index.ts` | `runBoardEngine` (fallback `emptyCeoOutput`) |
| `components/ceo-office/BoardPanel.tsx` | Tipo `BoardEngineOutput` |

---

## Release 0.7 — Build Engine

**Objetivo declarado:** cola de build, timeline, prompts multi-target, conectores, panel UI.

### Estado por componente

| Componente | Archivos | Estado | Notas |
|----------|----------|--------|-------|
| `runBuildEngine()` | `lib/build-engine/orchestrator/index.ts` | **Implementado** | Entry point |
| Queue / repository | `lib/build-engine/repository/index.ts` | **Implementado** | `buildQueue`, `buildQueueItem` |
| Planner | `lib/build-engine/planner/index.ts` | **Implementado** | Estados Pending → Live |
| Generator / artifacts | `lib/build-engine/generator/index.ts` | **Implementado** | Usado al construir cola |
| Timeline | `lib/build-engine/timeline/index.ts` | **Implementado** | |
| Monitor / prompts | `lib/build-engine/monitor/index.ts` | **Parcial** | Genera prompts (Cursor, Claude, Codex…); **`prompts` no se renderizan en UI** |
| QA assessment | `lib/build-engine/qa/index.ts` | **No implementado** (en uso) | Exportado, **sin llamadas** |
| Deployment readiness | `lib/build-engine/deployment/index.ts` | **No implementado** (en uso) | Exportado, **sin llamadas** |
| Connector stubs | `lib/build-engine/monitor/index.ts` | **Implementado** | Mostrados en `BuildQueuePanel` |
| `BuildQueuePanel` UI | `components/ceo-office/BuildQueuePanel.tsx` | **Implementado** | Cola, timeline, conectores |
| Integración `/dashboard` | — | **No implementado** | |

### Importadores de `@/lib/build-engine`

| Consumidor | Uso |
|------------|-----|
| `lib/ceo-office/index.ts` | `runBuildEngine` |
| `components/ceo-office/BuildQueuePanel.tsx` | Tipo `BuildEngineOutput` |

### Riesgo histórico

`generateAllPrompts` → `generateBuildPlan` (×4 por venture) fue fuente de crashes en CEO Office con ventures incompletos. Aislado del dashboard activo.

---

## Capa 0.3 — CEO Office (integración, no solicitada pero relevante)

| Módulo | Archivos | Estado | Conectado a `/dashboard` |
|--------|----------|--------|--------------------------|
| Orquestador | `lib/ceo-office/index.ts` | **Implementado** | **No** |
| UI CEO Office | `components/ceo-office/*` (12 archivos) | **Implementado** | **No** |
| Live activity | `lib/live/` (6 archivos) | **Implementado** | Solo vía ceo-office |
| Headquarters | `lib/headquarters/` (3 archivos) | **Implementado** | Solo vía ceo-office |
| Health | `lib/health/` (4 archivos) | **Implementado** | Solo vía ceo-office; también `lib/fos/portfolio-engine` |
| Notifications | `lib/notifications/` (3 archivos) | **Implementado** | Solo vía ceo-office |
| UI kit 0.3 | `components/ui/` (9 archivos) | **Implementado** | Solo vía ceo-office |

---

## Dashboard activo vs desconectado

### Activo (Release 0.2.5)

```
app/dashboard/page.tsx
  └─ components/dashboard/DashboardView.tsx
       └─ lib/portfolio (buildPortfolioDashboardData)
            └─ lib/store/ventures
```

**Bundle build (referencia):** `/dashboard` ≈ 8.81 kB (tras aislamiento).

### Desconectado temporalmente

| Componente | Archivo entry |
|------------|---------------|
| CEO Office view | `components/ceo-office/CeoOfficeView.tsx` |
| Barrel CEO Office | `components/ceo-office/index.ts` (comentario de aislamiento) |

Para reactivar: cambiar `app/dashboard/page.tsx` a importar `CeoOfficeView`.

---

## Código muerto y exports sin uso

### Funciones exportadas, nunca importadas

| Símbolo | Ubicación |
|---------|-----------|
| `tallyVotes` | `lib/board/voting/index.ts` |
| `runQaAssessment` | `lib/build-engine/qa/index.ts` |
| `assessDeploymentReadiness`, `getDeploymentTarget` | `lib/build-engine/deployment/index.ts` |
| `readFosMemory`, `clearFosMemory` | `lib/fos/memory/index.ts` |
| `getModuleOrder` | `lib/fos/scheduler/index.ts` |
| `canTransition`, `getCurrentFsmState`, `getAllowedNextStates` | `lib/fos/state-machine/index.ts` |
| `readCeoMemory`, `recordReview` | `lib/ceo/memory.ts` |
| `buildPriorityQueue` | `lib/ceo/index.ts` |
| `resolveCeoPriorityQueue` | Exportado en barrel; sin consumidores externos |
| `getFosPortfolioMetrics` | `lib/portfolio/fos-bridge.ts` |
| `getFosHealthAssessment` | `lib/health/fos-bridge.ts` |
| `getFosWorkerActivity` | `lib/live/fos-bridge.ts` |

### Datos calculados sin UI

| Dato | Origen | UI |
|------|--------|-----|
| `weeklyReview`, `monthlyReview` | `runCeoEngine` | Ninguna |
| `ventureReviews` | `runCeoEngine` | Ninguna |
| `build.prompts` | `runBuildEngine` | Ninguna (solo cola/timeline/conectores) |
| `fos.events` (historial bus) | `runFos` | Ninguna |

### Módulos / carpetas huérfanas

| Ruta | Motivo |
|------|--------|
| `lib/dashboard/` | Re-export `@deprecated` de `lib/portfolio` — **0 importadores** en `app/` o `components/` |
| `components/ceo-office/*` | Sin ruta activa que los monte |
| `components/ui/*` | Solo importados desde `ceo-office` |
| `lib/ceo-office/index.ts` | Solo importado desde `useCeoOfficeData.ts` |

---

## Imports huérfanos y barrels pesados

### Barrels de alto acoplamiento (riesgo de chunks grandes)

| Barrel | Re-exporta | Riesgo |
|--------|------------|--------|
| `lib/fos/index.ts` | 15+ módulos | Import único arrastra todo FOS |
| `lib/build-engine/index.ts` | orchestrator + monitor + qa + deployment | Barrel amplio |
| `lib/board/index.ts` | debate, consensus, voting, session, engine | Moderado |
| `lib/ceo/index.ts` | 10+ engines + tipos | Moderado |
| `components/ui/index.ts` | 8 componentes | Solo CEO Office |

**Recomendación (futura):** imports directos por submódulo al reactivar; evitar `import { … } from "@/lib/fos"` en entrypoints de página.

### Cadena que provocó inestabilidad (histórico)

`CeoOfficeView` → `safeBuildCeoOfficeData` → `runFos` + `runCeoEngine` + `runBuildEngine` → `generateBuildPlan` × N ventures.

Combinado con mezcla `next build` + `next dev` → error `./331.js` (caché webpack, no lógica de negocio).

---

## Rutas `app/`

| Ruta | Estado | Navegación | Notas |
|------|--------|------------|-------|
| `/` | **Activa** | Crear empresa | |
| `/dashboard` | **Activa** | Sidebar "Dashboard" | **0.2.5 DashboardView** |
| `/projects` | **Activa** | Sidebar | |
| `/venture/[id]` | **Activa** | Desde portfolio | |
| `/venture/[id]/print` | **Activa** | Export PDF | |
| `/intelligence/[id]` | **Activa** | Pipeline | |
| `/build/[id]` | **Activa** | Pipeline | |
| `/templates` | **Activa** | Sidebar Marketplace | |
| `/agents` | **Parcial** | Sidebar Workers + Settings | Página estática placeholder |
| `/ideas` | **Parcial** | Sidebar Knowledge | Tabla estática placeholder |
| `/resultado/[id]` | **Legacy** | — | Redirect → `/venture/[id]` |
| `/new-app` | **Rota** | Link desde `/templates` | **No existe `app/new-app/page.tsx`** — 404 |
| `/new-app/generating/[id]` | **Legacy** | — | Redirect → `/build/[id]` |
| `/api/generate/product` | **Activa** | — | |
| `/api/generate/research` | **Activa** | — | |

**Sidebar duplicado:** "Workers" y "Settings" apuntan ambos a `/agents`. "Analytics" apunta a `/dashboard` (duplicado con Dashboard).

**Link roto:** `app/templates/page.tsx` enlaza a `/new-app`, ruta inexistente (solo existe el redirect legacy `/new-app/generating/[id]`).

---

## Componentes desconectados

| Componente | Depende de | Motivo desconexión |
|------------|------------|-------------------|
| `CeoOfficeView` | ceo-office + 0.4–0.7 | `page.tsx` usa `DashboardView` |
| `CeoOfficeHeaderView` | ceo-office | |
| `AbsenceTimeline` | lib/live | |
| `HeadquartersPanel` | lib/headquarters | |
| `VentureHealthPanel` | lib/health | |
| `NotificationCenter` | lib/notifications | |
| `FocusModeOverlay` | ceo-office + ui | |
| `CeoInsightsPanel` | lib/ceo | |
| `BoardPanel` | lib/board | |
| `BuildQueuePanel` | lib/build-engine | |
| `ExecutiveCard` y resto `components/ui` | ceo-office types | |

**Componentes dashboard 0.2.5 — conectados:** `DashboardView`, `DashboardHeader`, `PortfolioMetricsRow`, `CeoBriefingCard`, `VenturePortfolioCardView`, `ActivityFeed`.

---

## Matriz resumen Implementado / Parcial / No implementado

| Área | Implementado | Parcial | No implementado |
|------|--------------|---------|-----------------|
| **0.4 FOS** | kernel, event-bus, 7 engines, worker-coordinator | scheduler (no ejecuta), state-machine, memory read, bridges getters | Integración en `/dashboard` |
| **0.5 CEO** | ceo-engine, briefings, summary, risks, ops, recommendation | weekly/monthly UI, venture reviews UI, memory read | `buildPriorityQueue`, integración `/dashboard` |
| **0.6 Board** | debate, consensus, castVotes, session, BoardPanel | — | `tallyVotes`, integración directa en rutas |
| **0.7 Build** | queue, planner, generator, timeline, connectors, BuildQueuePanel | prompts (sin UI) | qa, deployment, integración `/dashboard` |
| **CEO Office UI** | 12 componentes + orquestador | — | Montaje en ruta activa |

---

## Próximos pasos para reactivación gradual

1. **Mantener** `DashboardView` como fallback estable.
2. **Fase 1 — UI shell:** montar `CeoOfficeView` con datos solo de `lib/portfolio` (sin `runFos`/`runBuildEngine`).
3. **Fase 2 — FOS:** import directo `runFos` desde `lib/fos/kernel`; evitar barrel; verificar `reset:dev`.
4. **Fase 3 — CEO:** `runCeoEngine` sin board; luego board.
5. **Fase 4 — Build Engine:** `runBuildEngine` con try/catch por venture; añadir UI de prompts si se necesitan.
6. **Fase 5 — Live / HQ / Health / Notifications:** un panel cada vez.
7. **Siempre:** `npm run reset:dev` tras `npm run build`; no mezclar artefactos `.next`.

---

## Archivos clave por release (inventario)

### 0.4 — `lib/fos/` (14 archivos)
`types.ts`, `index.ts`, `kernel/`, `event-bus/`, `scheduler/`, `memory/`, `portfolio-engine/`, `priority-engine/`, `attention-engine/`, `decision-engine/`, `lifecycle-engine/`, `context-engine/`, `worker-coordinator/`, `state-machine/`

### 0.5 — `lib/ceo/` (10 archivos)
`index.ts`, `ceo-engine.ts`, `daily-briefing.ts`, `executive-summary.ts`, `recommendation-engine.ts`, `risk-analysis.ts`, `opportunity-engine.ts`, `venture-review.ts`, `priority.ts`, `memory.ts`

### 0.6 — `lib/board/` (8 archivos)
`index.ts`, `types.ts`, `board-engine/`, `session/`, `debate/`, `consensus/`, `voting/`, `member/`

### 0.7 — `lib/build-engine/` (10 archivos)
`index.ts`, `types.ts`, `orchestrator/`, `repository/`, `planner/`, `generator/`, `timeline/`, `monitor/`, `qa/`, `deployment/`

### Integración — aisladas
`lib/ceo-office/index.ts`, `components/ceo-office/*`, `lib/live/`, `lib/headquarters/`, `lib/health/`, `lib/notifications/`, `components/ui/`

---

*Auditoría generada sin cambios en código fuente de aplicación. Backup pre-recovery disponible en `ForgeOS_App_Factory_v0_1_backup_pre_recovery_20260702`.*
