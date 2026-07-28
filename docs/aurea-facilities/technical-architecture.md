# Technical Architecture — AUREA FACILITIES

**Program 10000 — Venture E2E**

## Stack propuesto

- **Frontend:** Next.js 15 — dashboard operativo, portal inquilino, PWA técnicos
- **Backend:** API REST — incidencias, SLA engine, jobs mantenimiento
- **Base de datos:** PostgreSQL multi-tenant con RLS
- **Tiempo real:** WebSockets para alertas SLA
- **Integraciones (v2):** BMS, IoT sensors, ERP

## Arquitectura de sistema

```
[Portal Inquilino] ──┐
[Dashboard Ops]  ──┼──► API Gateway ──► SLA Engine ──► PostgreSQL
[PWA Técnicos]   ──┘         │
                             └──► Job Queue (mantenimiento preventivo)
```

## MVP técnico

1. Onboarding multi-activo y zonas
2. Ticketing incidencias con SLA
3. Mantenimiento preventivo programado
4. Dashboard operativo y alertas
5. Portal inquilino básico (solicitudes)

## Build Platform

- **Build Context:** ensamblado desde venture fixture vía `buildBuildContextFromVenture`
- **Build DNA:** stack DNA generado vía `createBuildDnaFromContext`
- **Deploy Preview:** dry-run vía Build Pipeline

## Seguridad y compliance

- Multi-tenant RLS
- GDPR
- SLA contractual auditable

## Roadmap técnico 30/60/90

- **Día 30:** MVP ticketing + SLA, 1 piloto corporativo
- **Día 60:** Mantenimiento preventivo, portal inquilino v1
- **Día 90:** Módulo ESG básico, integración partners
