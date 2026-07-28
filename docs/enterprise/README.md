# ForgeOS Enterprise — RC11

Módulo de preparación enterprise: organizaciones multi-tenant, equipos, RBAC, auditoría, facturación y uso.

**Importante:** `lib/enterprise/` es distinto de `lib/autonomous-organization/` (RC6.5 executive org).

## Rutas

| Ruta | Descripción |
|------|-------------|
| `/enterprise` | Dashboard enterprise y flujo demo |
| `/admin` | Consola de administración |
| `/billing` | Planes y facturación mock |
| `/lab/enterprise` | Harness de ingeniería |

## Modo sandbox

- Sin SSO, SCIM ni billing reales
- Estado en `localStorage`
- Planes: `free`, `pro`, `enterprise`

## Documentación

- [architecture.md](./architecture.md)
- [rbac.md](./rbac.md)
- [demo.md](./demo.md)
