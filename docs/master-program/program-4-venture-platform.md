# Programa 4 — Venture Platform

**ID:** `venture-platform`  
**Estado:** `scaffold`  
**Versión programa:** 2030.0.0

## Objetivo

Operaciones de plataforma SaaS: launch, growth, notificaciones y headquarters.

## Pilares vinculados

- Studio (`lib/platform/studio`) — ops SaaS futuro
- Launch (`lib/platform/launch`)
- Growth (`lib/platform/growth`)

## Módulos existentes

| Módulo | Path | Estado |
|--------|------|--------|
| Launch Pillar | `lib/platform/launch` | scaffold |
| Growth Pillar | `lib/platform/growth` | scaffold |
| Notifications | `lib/notifications` | activo |
| Headquarters | `lib/headquarters` | activo |

## Scaffold SaaS (tipos only)

Definidos en `lib/programs/venture-platform/types.ts`:

- `PlatformOrganization` — multi-tenant orgs
- `PlatformTeam` — equipos y roles
- `PlatformApiKey` — API keys
- `PlatformBillingSubscription` — facturación

**Sin implementación runtime** — solo contratos para roadmap v3.0.

## Capabilities

- launch, growth, notifications, headquarters (mix active/scaffold)
- orgs, teams, api, billing (scaffold)

## Epic registry

Vacío (scaffold).

## Código

```
lib/programs/venture-platform/
├── index.ts
├── types.ts
├── program.ts
├── registry.ts
├── modules.ts
└── README.md
```
