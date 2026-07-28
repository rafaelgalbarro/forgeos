# Audit Log Enterprise

Registro de acciones en `lib/enterprise/audit-log.ts`.

## Almacenamiento

`localStorage` → `forgeos-enterprise-audit`

## Eventos

- `org.created`, `org.updated`
- `team.created`, `team.updated`
- `user.invited`, `user.role_changed`
- `plan.changed`
- `api_key.created`, `api_key.revoked`
- `webhook.created`
- `sso.configured`, `scim.enabled`

## UI

Tabla en `/enterprise` paso 7 y eventos generados desde admin console.
