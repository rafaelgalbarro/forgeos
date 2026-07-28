# ForgeOS Master Execution Roadmap — Programs 1 → 7

## Objetivo general

Convertir ForgeOS en el **Venture Operating System** definitivo: una plataforma capaz de crear, validar, construir, lanzar, operar, escalar, financiar y vender empresas digitales desde un único sistema.

## Reglas generales

- No romper Dashboard estable.
- No tocar rutas principales sin necesidad.
- No conectar módulos al Dashboard hasta validarlos en laboratorio.
- Toda lógica en `lib/`.
- React solo renderiza.
- Usar FHIS para toda UI.
- No imports circulares.
- No barrels pesados.
- No conectar proveedores IA directamente; usar AI Gateway + AI Orchestration.
- Cada épica debe terminar con:
  - `npm run build`
  - `npm run reset:dev`
- Verificar:
  - `/`
  - `/dashboard`
  - `/projects`
  - `/new-app`
  - `/design-system`
  - `/lab/executive-runtime`

---

## Program 1 — ForgeOS Runtime

**Objetivo:** Crear el kernel real de ForgeOS.

### Epic 4.0 — Event Bus

Crear: `lib/runtime/event-bus/`

Debe permitir:

- publicar eventos
- escuchar eventos
- registrar historial
- tipar eventos
- emitir eventos de venture, CEO, Board, Build, Memory, Capital

Eventos iniciales:

- `VENTURE_CREATED`
- `DISCOVERY_COMPLETED`
- `RESEARCH_COMPLETED`
- `CEO_DECISION_CREATED`
- `BOARD_CONSENSUS_REACHED`
- `VENTURE_APPROVED`
- `BUILD_REQUESTED`
- `BUILD_COMPLETED`
- `MEMORY_UPDATED`
- `RISK_DETECTED`
- `OPPORTUNITY_DETECTED`

No conectar todavía a Dashboard.

### Epic 4.1 — Runtime Scheduler

Crear: `lib/runtime/scheduler/`

Debe decidir:

- qué tarea ejecutar
- prioridad
- worker responsable
- venture afectado
- dependencia previa
- estado

No ejecutar IA todavía.

### Epic 4.2 — Venture State Machine

Crear: `lib/runtime/state-machine/`

Estados:

`IDEA`, `DISCOVERY`, `RESEARCH`, `PRODUCT`, `ARCHITECTURE`, `BUILD`, `QA`, `LAUNCH`, `GROWTH`, `SCALE`, `CAPITAL`, `EXIT`, `PAUSED`, `BLOCKED`, `ARCHIVED`

Todas las transiciones deben estar centralizadas.

### Epic 4.3 — Worker Runtime

Crear: `lib/runtime/workers/`

Debe registrar workers: CEO, Board, Research, Product, UX, CTO, Marketing, Finance, Legal, Growth, Build, QA, Capital.

Cada worker: `id`, `name`, `capabilities`, `status`, `run()`, `validate()`, `rollback()`.

### Epic 4.4 — Task Queue

Crear: `lib/runtime/task-queue/`

Debe soportar: `pending`, `running`, `completed`, `failed`, `cancelled`, `retry`, `timeout`, dead letter queue.

### Epic 4.5 — Execution Engine

Crear: `lib/runtime/execution-engine/`

Debe coordinar: Event Bus, Scheduler, State Machine, Worker Runtime, Task Queue, Memory.

No conectar a producción todavía. Crear ruta laboratorio: `/lab/runtime`.

---

## Program 2 — Autonomous Company

**Objetivo:** Hacer que ForgeOS se comporte como una empresa operativa.

### Epic 5.0 — Persistent CEO

Crear: `lib/autonomous-company/ceo/`

Debe observar portfolio, generar prioridades y emitir eventos.

### Epic 5.1 — Executive Board Runtime

Crear: `lib/autonomous-company/board/`

Debe usar: AI Orchestration, Consensus Engine, Decision Graph, Memory.

Validar primero en `/lab/executive-runtime`.

### Epic 5.2 — AI Departments

Crear: `lib/autonomous-company/departments/`

Departamentos: Marketing, Finance, Legal, Operations, Support, Growth, People, Capital.

Solo arquitectura + mocks.

### Epic 5.3 — Company Memory

Crear: `lib/autonomous-company/memory/`

Debe guardar: decisiones, riesgos, acciones, eventos, aprendizajes, resultados.

### Epic 5.4 — Autonomous Workflows

Crear: `lib/autonomous-company/workflows/`

CEO crea tareas → Workers ejecutan → CEO revisa → Memory registra.

### Epic 5.5 — Self Improvement

Crear: `lib/autonomous-company/self-improvement/`

Debe detectar: patrones repetidos, errores frecuentes, buenas prácticas, acciones recomendadas.

---

## Program 3 — Build Platform

**Objetivo:** Que ForgeOS pueda construir software real.

### Epic 6.0 — Build Engine Runtime

Crear: `lib/build-platform/engine/`

Debe consumir: CEO decisions, Board consensus, Build Plan, Research, Product PRD, Knowledge, Memory.

### Epic 6.1 — Architecture Generator

Crear: `lib/build-platform/architecture/`

Generar: frontend architecture, backend architecture, database, auth, infra, API map.

### Epic 6.2 — UI Generator

Crear: `lib/build-platform/ui-generator/`

Debe generar pantallas usando FHIS.

### Epic 6.3 — Backend Generator

Crear: `lib/build-platform/backend-generator/`

Debe generar: API routes, DB schema, auth flows, workers, services.

### Epic 6.4 — QA Engine

Crear: `lib/build-platform/qa/`

Debe generar: test plan, accessibility checks, performance checks, security checks, regression checks.

### Epic 6.5 — Deployment Engine

Crear: `lib/build-platform/deployment/`

Preparar adapters: Vercel, Docker, Railway, Supabase, Cloudflare, GitHub.

No conectar credenciales todavía.

---

## Program 4 — Forge Marketplace

**Objetivo:** Crear el ecosistema reutilizable de ForgeOS.

### Epic 7.0 — Marketplace Core

Crear: `lib/marketplace/core/`

Tipos: Template, Agent, Worker, Plugin, Playbook, Architecture, PromptPack, KnowledgePack, IndustryPack.

### Epic 7.1 — Templates

Crear: `lib/marketplace/templates/`

Plantillas: SaaS, Marketplace, CRM, ERP, Booking, AI Assistant, Dashboard, Mobile App.

### Epic 7.2 — Workers Marketplace

Crear: `lib/marketplace/workers/`

Workers instalables y versionados.

### Epic 7.3 — Plugins

Crear: `lib/marketplace/plugins/`

Plugins: Stripe, Supabase, Clerk, GitHub, Vercel, OpenAI, Claude, Gemini.

### Epic 7.4 — Integrations Registry

Crear: `lib/marketplace/integrations/`

Adapters preparados. Sin credenciales reales.

### Epic 7.5 — Community Layer

Crear docs y arquitectura para: ratings, reviews, usage, versioning, quality score.

---

## Program 5 — Forge Capital

**Objetivo:** Preparar startups para inversión, compra, venta y escalado.

### Epic 8.0 — Venture Scoring

Crear: `lib/capital/venture-scoring/`

Debe calcular: investment readiness, risk, traction readiness, market readiness, team readiness, tech readiness.

### Epic 8.1 — Investment Engine

Crear: `lib/capital/investment-engine/`

Debe generar: funding recommendation, round strategy, valuation range, investor profile.

### Epic 8.2 — Due Diligence AI

Crear: `lib/capital/due-diligence/`

Áreas: legal, financial, technical, market, product, team.

### Epic 8.3 — Startup Marketplace

Crear: `lib/capital/startup-marketplace/`

Preparado para: comprar, vender, invertir, listar startups.

No crear UI pública todavía.

### Epic 8.4 — Investor Workspace

Crear: `lib/capital/investor-workspace/`

Debe soportar: portfolio, KPIs, investor updates, board reports, data room.

### Epic 8.5 — Venture Exchange

Crear: `lib/capital/venture-exchange/`

Preparar arquitectura para mercado interno de ventures.

---

## Program 6 — Forge Cloud

**Objetivo:** Convertir ForgeOS en SaaS multiusuario.

### Epic 9.0 — Auth Architecture

Preparar: users, sessions, organizations, roles, permissions.

No conectar proveedor todavía.

### Epic 9.1 — Organizations

Crear: organization model, team model, workspace model.

### Epic 9.2 — Billing Architecture

Preparar: plans, subscriptions, usage, credits, invoices.

### Epic 9.3 — Public API

Crear arquitectura: API keys, rate limits, scopes, webhooks.

### Epic 9.4 — SDK

Preparar: JS SDK, Plugin SDK, Worker SDK.

---

## Program 7 — Forge Ecosystem

**Objetivo:** Abrir ForgeOS a terceros.

### Epic 10.0 — Developer SDK

Crear docs y tipos para desarrolladores.

### Epic 10.1 — Plugin SDK

Crear estructura para crear plugins externos.

### Epic 10.2 — Worker SDK

Crear estructura para crear workers externos.

### Epic 10.3 — Marketplace SDK

Crear estructura para publicar en Forge Marketplace.

### Epic 10.4 — Partner Program

Crear documentación: certificación, niveles, revenue share, quality rules.

---

## Delivery rules

Cada épica debe crear:

- `README.md`
- `types.ts`
- `registry.ts`
- `engine.ts` cuando aplique
- tests o validators simples si aplica
- docs en `docs/programs/`

Cada informe debe incluir:

- Programa
- Épica
- Objetivo
- Archivos creados
- Archivos modificados
- Qué queda conectado
- Qué queda aislado
- Riesgos
- Build status
- Rutas verificadas
- Próxima épica recomendada
