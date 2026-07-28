# Arquitectura Enterprise

## Separación de dominios

| Módulo | Propósito |
|--------|-----------|
| `lib/enterprise/` | Multi-tenant SaaS: orgs, teams, RBAC, billing |
| `lib/autonomous-organization/` | Organización ejecutiva autónoma (RC6.5 CEO) |

No comparten estado ni rutas.

## Capas

```
components/enterprise/     → UI FHIS
lib/enterprise/            → Engines (in-memory + localStorage)
lib/lab/enterprise-lab.ts  → Lab harness
```

## Engines

- `organization-engine` — tenants enterprise
- `user-engine` / `team-engine` — membresía
- `rbac-engine` / `permissions-engine` — roles y matriz
- `audit-log` — eventos inmutables (demo)
- `billing-engine` / `subscription-engine` / `usage-engine`
- `sso-engine` / `scim-engine` — stubs ready
- `compliance-engine` / `security-center`
- `api-keys` / `webhooks`

## Persistencia

Claves `localStorage`:

- `forgeos-enterprise-state`
- `forgeos-enterprise-audit`
- `forgeos-enterprise-usage`
