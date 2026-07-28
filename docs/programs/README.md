# ForgeOS Master Execution Roadmap — Programs 1–7

Documentación de gobernanza para la evolución de ForgeOS hacia el **Venture Operating System** definitivo: crear, validar, construir, lanzar, operar, escalar, financiar y vender empresas digitales desde un único sistema.

## Programas

| # | Programa | Objetivo | Documento |
|---|----------|----------|-----------|
| 1 | [ForgeOS Runtime](program-1-runtime.md) | Kernel real: event bus, scheduler, state machine, workers, task queue, execution engine | Epics 4.0–4.5 |
| 2 | [Autonomous Company](program-2-autonomous-company.md) | Empresa operativa autónoma: CEO, Board, departamentos, memory, workflows | Epics 5.0–5.5 |
| 3 | [Build Platform](program-3-build-platform.md) | Construcción de software real: engine, arquitectura, UI, backend, QA, deployment | Epics 6.0–6.5 |
| 4 | [Forge Marketplace](program-4-forge-marketplace.md) | Ecosistema reutilizable: templates, workers, plugins, integrations | Epics 7.0–7.5 |
| 5 | [Forge Capital](program-5-forge-capital.md) | Inversión, compra, venta y escalado de ventures | Epics 8.0–8.5 |
| 6 | [Forge Cloud](program-6-forge-cloud.md) | SaaS multiusuario: auth, orgs, billing, API pública, SDK | Epics 9.0–9.4 |
| 7 | [Forge Ecosystem](program-7-forge-ecosystem.md) | Apertura a terceros: developer SDK, plugins, workers, partners | Epics 10.0–10.4 |

## Documento maestro

Ver [MASTER_ROADMAP.md](./MASTER_ROADMAP.md) para el roadmap completo: todos los epics, reglas de entrega e informes por épica.

## Reglas generales

- No romper Dashboard estable.
- No conectar módulos al Dashboard hasta validarlos en laboratorio.
- Toda lógica en `lib/`; React solo renderiza.
- Usar FHIS para toda UI.
- No imports circulares ni barrels pesados.
- IA solo vía AI Gateway + AI Orchestration.
- Cada épica termina con `npm run build` y `npm run reset:dev`.
- Verificar rutas: `/`, `/dashboard`, `/projects`, `/new-app`, `/design-system`, `/lab/executive-runtime`.

## Relación con otros docs

- `docs/master-program/` — Programas 2030 (venture-core, execution, intelligence, platform, ecosystem).
- `docs/platform/` — Pilares platform v1.
- `docs/delivery/` — Sistema de entrega operativo 2030.1+.
- `lib/programs/` — Registries de programas existentes (no modificar en epics de runtime).

## Estado actual

| Epic | Estado | Ubicación |
|------|--------|-----------|
| 4.0 Event Bus | Implementado | `lib/runtime/event-bus/` |
| 4.1–4.5 | Pendiente | — |
| 5.0+ | Pendiente | — |
