# Master Roadmap — Platform v1 → v3

## v1.0 (actual) — Architecture Scaffold

- [x] `lib/platform/` con 9 pilares
- [x] Shared layer + registry
- [x] Adaptadores type-only hacia lib existente
- [x] Documentación `docs/platform/`
- [x] Build pasa sin wiring en app

## v1.1 — Strategy + Product ready

- [ ] Discovery adapter runtime (client)
- [ ] PRD adapter delegación server
- [ ] Tests de contrato pillar engine

## v1.2 — Build + Intelligence

- [ ] Build plan adapter activo
- [ ] Intelligence memory sync
- [ ] Primer connector (Cursor prompt export)

## v2.0 — CEO + Studio orchestration

- [ ] CEO office bridge conectado
- [ ] Portfolio snapshot desde platform
- [ ] Event bus integrado con FOS

## v2.5 — Launch + Growth

- [ ] Módulos GTM tipados → implementación
- [ ] Funnels y experimentos básicos

## v3.0 — Capital + Marketplace

- [ ] Investor pack generation
- [ ] Data room export
- [ ] Platform API pública (ver 14_api_strategy.md)

## Alineación con master-plan

Este roadmap complementa `docs/master-plan/17_roadmap_v1_to_v10.md` enfocándose en la capa platform, no en features de UI.

## Master Program 2030

La capa de gobernanza y arquitectura de programas vive en:

- **Código:** `lib/programs/` — `bootstrapProgramsRegistry()`, 5 programas, mapping pilar ↔ módulo
- **Documentación:** `docs/master-program/` — visión, principios, metodología, gobernanza

Versión actual: **2030.0.0**. No wired en `app/` — organizacional + registries + docs únicamente.

Ver [docs/master-program/README.md](../master-program/README.md).
