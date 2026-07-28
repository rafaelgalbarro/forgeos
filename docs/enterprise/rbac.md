# RBAC Enterprise

## Roles

| Rol | Descripción |
|-----|-------------|
| `owner` | Acceso total incl. billing |
| `admin` | Administración sin billing write |
| `manager` | Equipos y usuarios (lectura) |
| `member` | Acceso operativo básico |
| `viewer` | Solo lectura |

## Permisos

Formato `recurso:acción`:

- `org:read`, `org:write`
- `team:read`, `team:write`
- `users:read`, `users:write`
- `billing:read`, `billing:write`
- `usage:read`, `audit:read`
- `api_keys:*`, `webhooks:*`
- `security:*`, `compliance:read`

La matriz se genera en `permissions-engine.ts` desde `rbac-engine.ts`.

## Demo

En `/enterprise` paso 4 muestra la matriz completa por rol.
